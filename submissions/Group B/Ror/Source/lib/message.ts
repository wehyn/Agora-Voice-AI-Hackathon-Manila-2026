import { decodeStreamMessage } from '@/lib/utils';
import type { IAgoraRTCClient, UID } from 'agora-rtc-react';

const DEFAULT_MESSAGE_CACHE_TIMEOUT = 1000 * 60 * 5;
const LOG = '[MessageService]';

export type TDataChunk = {
  message_id: string;
  part_idx: number;
  part_sum: number;
  content: string;
};

export enum EMessageStatus {
  IN_PROGRESS = 0,
  END = 1,
  INTERRUPTED = 2,
}

export enum ETranscriptionObjectType {
  USER_TRANSCRIPTION = 'user.transcription',
  AGENT_TRANSCRIPTION = 'assistant.transcription',
  MSG_INTERRUPTED = 'message.interrupt',
}

export enum EMessageEngineMode {
  TEXT = 'text',
  WORD = 'word',
  AUTO = 'auto',
}

export interface ITranscriptionBase {
  object: ETranscriptionObjectType;
  text: string;
  start_ms: number;
  duration_ms: number;
  language: string;
  turn_id: number;
  stream_id: number;
  user_id: string;
  words: TDataChunkMessageWord[] | null;
}

export type TDataChunkMessageWord = {
  word: string;
  start_ms: number;
  duration_ms: number;
  stable: boolean;
};

export interface IUserTranscription extends ITranscriptionBase {
  object: ETranscriptionObjectType.USER_TRANSCRIPTION;
  final: boolean;
}

export interface IAgentTranscription extends ITranscriptionBase {
  object: ETranscriptionObjectType.AGENT_TRANSCRIPTION;
  quiet: boolean;
  turn_seq_id: number;
  turn_status: EMessageStatus;
}

export interface IMessageInterrupt {
  object: ETranscriptionObjectType.MSG_INTERRUPTED;
  message_id: string;
  data_type: 'message';
  turn_id: number;
  start_ms: number;
  send_ts: number;
}

export interface IMessageListItem {
  uid: number;
  turn_id: number;
  text: string;
  status: EMessageStatus;
}

interface IMessageArrayItem {
  uid: number;
  turn_id: number;
  _time: number;
  text: string;
  status: EMessageStatus;
  metadata: unknown;
}

export class MessageEngine {
  private _messageCache: Record<string, TDataChunk[]> = {};
  private _messageCacheTimeout: number = DEFAULT_MESSAGE_CACHE_TIMEOUT;
  private _mode: EMessageEngineMode = EMessageEngineMode.AUTO;
  private _isRunning: boolean = false;
  private _rtcEngine: IAgoraRTCClient | null = null;

  public messageList: IMessageArrayItem[] = [];
  public onMessageListUpdate:
    | ((messageList: IMessageListItem[]) => void)
    | null = null;

  constructor(
    rtcEngine: IAgoraRTCClient,
    renderMode?: EMessageEngineMode,
    callback?: (messageList: IMessageListItem[]) => void
  ) {
    this._rtcEngine = rtcEngine;
    this._listenRtcEvents();
    this.run({ legacyMode: false });
    this._mode = renderMode ?? EMessageEngineMode.TEXT;
    this.onMessageListUpdate = callback ?? null;
  }

  private _listenRtcEvents() {
    if (!this._rtcEngine) return;
    this._rtcEngine.on('stream-message', (_: UID, payload: Uint8Array) => {
      this.handleStreamMessage(payload);
    });
  }

  public run(options?: { legacyMode?: boolean }) {
    this._isRunning = true;
  }

  public teardownInterval() {}

  public cleanup() {
    this._isRunning = false;
    this._messageCache = {};
    this.messageList = [];
    this._mode = EMessageEngineMode.AUTO;
  }

  public handleStreamMessage(stream: Uint8Array) {
    if (!this._isRunning) return;
    const chunk = decodeStreamMessage(stream);
    this.handleChunk<
      IUserTranscription | IAgentTranscription | IMessageInterrupt
    >(chunk, this.handleMessage.bind(this));
  }

  public handleMessage(
    message: IUserTranscription | IAgentTranscription | IMessageInterrupt
  ) {
    const isAgentMessage =
      message.object === ETranscriptionObjectType.AGENT_TRANSCRIPTION;
    const isUserMessage =
      message.object === ETranscriptionObjectType.USER_TRANSCRIPTION;
    const isInterrupt =
      message.object === ETranscriptionObjectType.MSG_INTERRUPTED;

    if (!isAgentMessage && !isUserMessage && !isInterrupt) return;

    if (isAgentMessage || isUserMessage) {
      this.handleTextMessage(message as IUserTranscription);
      return;
    }

    if (isInterrupt) {
      this.handleMessageInterrupt(message as IMessageInterrupt);
    }
  }

  public handleTextMessage(message: IUserTranscription) {
    const turn_id = message.turn_id;
    const text = message.text || '';
    const stream_id = message.stream_id;

    const existing = this.messageList.find(
      (item) => item.turn_id === turn_id && item.uid === stream_id
    );

    if (!existing) {
      const item: IMessageArrayItem = {
        turn_id,
        uid: stream_id,
        _time: Date.now(),
        text,
        status: EMessageStatus.END,
        metadata: message,
      };
      if (turn_id === 0) {
        this.messageList = [item, ...this.messageList];
      } else {
        this.messageList.push(item);
      }
    } else {
      existing.text = text;
      existing.status = EMessageStatus.END;
      existing.metadata = message;
    }

    this._emit();
  }

  public handleMessageInterrupt(message: IMessageInterrupt) {
    const existing = this.messageList.find(
      (item) => item.turn_id === message.turn_id
    );
    if (existing) {
      existing.status = EMessageStatus.INTERRUPTED;
    }
    this._emit();
  }

  public handleChunk<
    T extends
      | IUserTranscription
      | IAgentTranscription
      | IMessageInterrupt
  >(chunk: string, callback?: (message: T) => void): void {
    try {
      const [msgId, partIdx, partSum, partData] = chunk.split('|');
      const input: TDataChunk = {
        message_id: msgId,
        part_idx: parseInt(partIdx, 10),
        part_sum: partSum === '???' ? -1 : parseInt(partSum, 10),
        content: partData,
      };

      if (input.part_sum === -1) return;

      if (!this._messageCache[input.message_id]) {
        this._messageCache[input.message_id] = [];
        setTimeout(() => {
          if (
            this._messageCache[input.message_id] &&
            this._messageCache[input.message_id].length < input.part_sum
          ) {
            delete this._messageCache[input.message_id];
          }
        }, this._messageCacheTimeout);
      }

      if (
        !this._messageCache[input.message_id].find(
          (item) => item.part_idx === input.part_idx
        )
      ) {
        this._messageCache[input.message_id].push(input);
      }
      this._messageCache[input.message_id].sort(
        (a, b) => a.part_idx - b.part_idx
      );

      if (this._messageCache[input.message_id].length === input.part_sum) {
        const message = this._messageCache[input.message_id]
          .map((c) => c.content)
          .join('');
        const decoded = JSON.parse(atob(message));
        callback?.(decoded);
        delete this._messageCache[input.message_id];
      }
    } catch (error) {
      console.error(LOG, 'handleChunk error', error);
    }
  }

  private _emit() {
    this.onMessageListUpdate?.(this.messageList as IMessageListItem[]);
  }
}
