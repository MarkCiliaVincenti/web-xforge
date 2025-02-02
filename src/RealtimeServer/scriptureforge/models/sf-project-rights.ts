import { Operation, ProjectRight, ProjectRights } from '../../common/models/project-rights';
import { SFProjectRole } from './sf-project-role';

export enum SFProjectDomain {
  Texts = 'texts',
  Project = 'project',
  ProjectUserConfigs = 'project_user_configs',
  Questions = 'questions',
  Answers = 'answers',
  AnswerComments = 'answer_comments',
  AnswerStatus = 'answer_status',
  Likes = 'likes',
  PTNoteThreads = 'pt_note_threads',
  SFNoteThreads = 'sf_note_threads',
  Notes = 'notes'
}

export class SFProjectRights extends ProjectRights {
  constructor() {
    super();

    const observerRights: ProjectRight[] = [
      { projectDomain: SFProjectDomain.ProjectUserConfigs, operation: Operation.ViewOwn },
      { projectDomain: SFProjectDomain.ProjectUserConfigs, operation: Operation.EditOwn },

      { projectDomain: SFProjectDomain.Texts, operation: Operation.View },

      { projectDomain: SFProjectDomain.Questions, operation: Operation.View },

      { projectDomain: SFProjectDomain.Answers, operation: Operation.View },

      { projectDomain: SFProjectDomain.AnswerComments, operation: Operation.View },

      { projectDomain: SFProjectDomain.AnswerStatus, operation: Operation.View },

      { projectDomain: SFProjectDomain.Likes, operation: Operation.View },

      { projectDomain: SFProjectDomain.SFNoteThreads, operation: Operation.View },

      { projectDomain: SFProjectDomain.Notes, operation: Operation.View }
    ];
    this.addRights(SFProjectRole.Observer, observerRights);

    const ptObserverRights: ProjectRight[] = observerRights.concat([
      { projectDomain: SFProjectDomain.Project, operation: Operation.View },

      { projectDomain: SFProjectDomain.PTNoteThreads, operation: Operation.View }
    ]);
    this.addRights(SFProjectRole.ParatextObserver, ptObserverRights);

    const reviewerRights: ProjectRight[] = observerRights.concat([
      { projectDomain: SFProjectDomain.Answers, operation: Operation.Create },
      { projectDomain: SFProjectDomain.Answers, operation: Operation.EditOwn },
      { projectDomain: SFProjectDomain.Answers, operation: Operation.DeleteOwn },

      { projectDomain: SFProjectDomain.AnswerComments, operation: Operation.Create },
      { projectDomain: SFProjectDomain.AnswerComments, operation: Operation.EditOwn },
      { projectDomain: SFProjectDomain.AnswerComments, operation: Operation.DeleteOwn },

      { projectDomain: SFProjectDomain.Likes, operation: Operation.Create },
      { projectDomain: SFProjectDomain.Likes, operation: Operation.DeleteOwn },

      { projectDomain: SFProjectDomain.SFNoteThreads, operation: Operation.Create },
      { projectDomain: SFProjectDomain.SFNoteThreads, operation: Operation.DeleteOwn },

      { projectDomain: SFProjectDomain.Notes, operation: Operation.Create },
      { projectDomain: SFProjectDomain.Notes, operation: Operation.EditOwn },
      { projectDomain: SFProjectDomain.Notes, operation: Operation.DeleteOwn }
    ]);
    this.addRights(SFProjectRole.Reviewer, reviewerRights);
    this.addRights(SFProjectRole.CommunityChecker, reviewerRights);

    const ptReviewerRights: ProjectRight[] = reviewerRights.concat([
      { projectDomain: SFProjectDomain.Project, operation: Operation.View },

      { projectDomain: SFProjectDomain.PTNoteThreads, operation: Operation.Create },
      { projectDomain: SFProjectDomain.PTNoteThreads, operation: Operation.DeleteOwn }
    ]);
    this.addRights(SFProjectRole.ParatextConsultant, ptReviewerRights);

    const translatorRights: ProjectRight[] = ptReviewerRights.concat([
      { projectDomain: SFProjectDomain.Texts, operation: Operation.Edit }
    ]);
    this.addRights(SFProjectRole.ParatextTranslator, translatorRights);

    const administratorRights: ProjectRight[] = ptObserverRights.concat([
      { projectDomain: SFProjectDomain.Texts, operation: Operation.Edit },

      { projectDomain: SFProjectDomain.Questions, operation: Operation.Create },
      { projectDomain: SFProjectDomain.Questions, operation: Operation.Edit },
      { projectDomain: SFProjectDomain.Questions, operation: Operation.Delete },

      { projectDomain: SFProjectDomain.Answers, operation: Operation.EditOwn },
      { projectDomain: SFProjectDomain.Answers, operation: Operation.Delete },

      { projectDomain: SFProjectDomain.AnswerComments, operation: Operation.Create },
      { projectDomain: SFProjectDomain.AnswerComments, operation: Operation.EditOwn },
      { projectDomain: SFProjectDomain.AnswerComments, operation: Operation.Delete },

      { projectDomain: SFProjectDomain.AnswerStatus, operation: Operation.Edit },

      { projectDomain: SFProjectDomain.Likes, operation: Operation.Create },
      { projectDomain: SFProjectDomain.Likes, operation: Operation.DeleteOwn },

      { projectDomain: SFProjectDomain.PTNoteThreads, operation: Operation.Create },
      { projectDomain: SFProjectDomain.PTNoteThreads, operation: Operation.Edit },
      { projectDomain: SFProjectDomain.PTNoteThreads, operation: Operation.Delete },

      { projectDomain: SFProjectDomain.SFNoteThreads, operation: Operation.Create },
      { projectDomain: SFProjectDomain.SFNoteThreads, operation: Operation.Edit },
      { projectDomain: SFProjectDomain.SFNoteThreads, operation: Operation.Delete },

      { projectDomain: SFProjectDomain.Notes, operation: Operation.Create },
      { projectDomain: SFProjectDomain.Notes, operation: Operation.EditOwn },
      { projectDomain: SFProjectDomain.Notes, operation: Operation.Delete }
    ]);
    this.addRights(SFProjectRole.ParatextAdministrator, administratorRights);
  }
}

export const SF_PROJECT_RIGHTS = new SFProjectRights();
