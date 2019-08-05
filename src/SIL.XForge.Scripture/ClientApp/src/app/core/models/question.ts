import { Answer } from './answer';
import { VerseRefData } from './verse-ref-data';

export interface Question {
  id: string;
  ownerRef: string;
  source?: QuestionSource;
  scriptureStart?: VerseRefData;
  scriptureEnd?: VerseRefData;
  // used by Transcelerator to identify question (don't display to user)
  textEn?: string;
  text?: string;
  audioUrl?: string;
  modelAnswer?: string;
  answers?: Answer[];
  isArchived?: boolean;
  dateArchived?: string;
}

export enum QuestionSource {
  Created = 'Created',
  Transcelerator = 'Transcelerator'
}
