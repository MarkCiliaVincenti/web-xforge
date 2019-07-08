/* tslint:disable:ordered-imports max-line-length */
// <auto-generated>
//     Generated with CodeGeneratorApp v9.12.0.0 (Newtonsoft.Json v11.0.0.0) (http://NJsonSchema.org)
//     Last Generated on 192019-7-10 15:36
// </auto-generated>

import { Project } from 'xforge-common/models/project';
import { ProjectRef } from 'xforge-common/models/project';
import { ProjectUser } from 'xforge-common/models/project-user';
import { ProjectUserRef } from 'xforge-common/models/project-user';

/** --- Generated Interface */
export interface InputSystem {
  abbreviation?: string;
  tag?: string;
  languageName?: string;
  isRightToLeft?: boolean;
}

export abstract class SFProjectUserBase extends ProjectUser {
  /** type identifier string for domain type mapping */
  static readonly TYPE: string = 'projectUser';
  selectedTask?: string;
  selectedBookId?: string;
  selectedChapter?: number;
  isTargetTextRight?: boolean;
  confidenceThreshold?: number;
  isSuggestionsEnabled?: boolean;
  selectedSegment?: string;
  selectedSegmentChecksum?: number;
  questionRefsRead?: string[];
  answerRefsRead?: string[];
  commentRefsRead?: string[];
  constructor(init?: Partial<SFProjectUserBase>) {
    super(SFProjectUserBase.TYPE, init);
  }
}

/** ResourceRef class for SFProjectUserBase **/
export class SFProjectUserRef extends ProjectUserRef {
  static readonly TYPE: string = SFProjectUserBase.TYPE;

  constructor(id: string) {
    super(SFProjectUserRef.TYPE, id);
  }
}

export abstract class SFProjectBase extends Project {
  /** type identifier string for domain type mapping */
  static readonly TYPE: string = 'project';
  paratextId?: string;
  checkingEnabled?: boolean;
  usersSeeEachOthersResponses?: boolean;
  downloadAudioFiles?: boolean;
  translateEnabled?: boolean;
  sourceParatextId?: string;
  sourceInputSystem?: InputSystem;
  constructor(init?: Partial<SFProjectBase>) {
    super(SFProjectBase.TYPE, init);
  }
}

/** ResourceRef class for SFProjectBase **/
export class SFProjectRef extends ProjectRef {
  static readonly TYPE: string = SFProjectBase.TYPE;

  constructor(id: string) {
    super(SFProjectRef.TYPE, id);
  }
}
