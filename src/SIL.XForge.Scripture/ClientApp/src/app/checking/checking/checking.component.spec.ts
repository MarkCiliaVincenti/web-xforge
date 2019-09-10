import { MdcDialogRef } from '@angular-mdc/web';
import { DebugElement } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ngfModule } from 'angular-file';
import { AngularSplitModule } from 'angular-split';
import { SharingLevel } from 'realtime-server/lib/common/models/sharing-level';
import { User } from 'realtime-server/lib/common/models/user';
import { Comment } from 'realtime-server/lib/scriptureforge/models/comment';
import { Question } from 'realtime-server/lib/scriptureforge/models/question';
import { SFProject } from 'realtime-server/lib/scriptureforge/models/sf-project';
import { SFProjectRole } from 'realtime-server/lib/scriptureforge/models/sf-project-role';
import { SFProjectUserConfig } from 'realtime-server/lib/scriptureforge/models/sf-project-user-config';
import { TextData } from 'realtime-server/lib/scriptureforge/models/text-data';
import * as RichText from 'rich-text';
import { of } from 'rxjs';
import { anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';
import { AccountService } from 'xforge-common/account.service';
import { AvatarTestingModule } from 'xforge-common/avatar/avatar-testing.module';
import { EditNameDialogComponent } from 'xforge-common/edit-name-dialog/edit-name-dialog.component';
import { MemoryRealtimeQueryAdapter } from 'xforge-common/memory-realtime-remote-store';
import { RealtimeQuery } from 'xforge-common/models/realtime-query';
import { Snapshot } from 'xforge-common/models/snapshot';
import { UserDoc } from 'xforge-common/models/user-doc';
import { UserProfileDoc } from 'xforge-common/models/user-profile-doc';
import { NoticeService } from 'xforge-common/notice.service';
import { ProjectService } from 'xforge-common/project.service';
import { ShareControlComponent } from 'xforge-common/share/share-control.component';
import { ShareDialogComponent } from 'xforge-common/share/share-dialog.component';
import { ShareComponent } from 'xforge-common/share/share.component';
import { TestRealtimeService } from 'xforge-common/test-realtime.service';
import { UICommonModule } from 'xforge-common/ui-common.module';
import { UserService } from 'xforge-common/user.service';
import { objectId } from 'xforge-common/utils';
import { getQuestionDocId, QuestionDoc } from '../../core/models/question-doc';
import { SFProjectDoc } from '../../core/models/sf-project-doc';
import { getSFProjectUserConfigDocId, SFProjectUserConfigDoc } from '../../core/models/sf-project-user-config-doc';
import { SF_REALTIME_DOC_TYPES } from '../../core/models/sf-realtime-doc-types';
import { Delta, getTextDocId, TextDoc } from '../../core/models/text-doc';
import { SFProjectService } from '../../core/sf-project.service';
import { SharedModule } from '../../shared/shared.module';
import { CheckingAnswersComponent } from './checking-answers/checking-answers.component';
import { CheckingCommentFormComponent } from './checking-answers/checking-comments/checking-comment-form/checking-comment-form.component';
import { CheckingCommentsComponent } from './checking-answers/checking-comments/checking-comments.component';
import { CheckingOwnerComponent } from './checking-answers/checking-owner/checking-owner.component';
import { CheckingAudioCombinedComponent } from './checking-audio-combined/checking-audio-combined.component';
import { AudioTimePipe, CheckingAudioPlayerComponent } from './checking-audio-player/checking-audio-player.component';
import { CheckingAudioRecorderComponent } from './checking-audio-recorder/checking-audio-recorder.component';
import { CheckingQuestionsComponent } from './checking-questions/checking-questions.component';
import { CheckingTextComponent } from './checking-text/checking-text.component';
import { CheckingComponent } from './checking.component';
import { FontSizeComponent } from './font-size/font-size.component';

describe('CheckingComponent', () => {
  let env: TestEnvironment;
  beforeEach(fakeAsync(() => {
    env = new TestEnvironment();
  }));

  describe('Interface', () => {
    it('can navigate using next button', fakeAsync(() => {
      env.setupAdminScenarioData();
      env.selectQuestion(1);
      env.clickButton(env.nextButton);
      tick(env.questionReadTimer);
      const nextQuestion = env.currentQuestion;
      expect(nextQuestion).toEqual(2);
    }));

    it('can navigate using previous button', fakeAsync(() => {
      env.setupAdminScenarioData();
      env.selectQuestion(2);
      env.clickButton(env.previousButton);
      tick(env.questionReadTimer);
      const nextQuestion = env.currentQuestion;
      expect(nextQuestion).toEqual(1);
    }));

    it('check navigate buttons disable at the end of the question list', fakeAsync(() => {
      env.setupAdminScenarioData();
      env.selectQuestion(1);
      const prev = env.previousButton;
      const next = env.nextButton;
      expect(prev.nativeElement.disabled).toBe(true);
      expect(next.nativeElement.disabled).toBe(false);
      env.selectQuestion(15);
      expect(prev.nativeElement.disabled).toBe(false);
      expect(next.nativeElement.disabled).toBe(true);
    }));

    it('responds to remote removed from project', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(1);
      expect(env.component.questionDocs.length).toEqual(15);
      env.component.projectDoc.submitJson0Op(op => op.unset<string>(p => p.userRoles[env.checkerUser.id]), false);
      env.waitForSliderUpdate();
      expect(env.component.projectDoc).toBeNull();
      expect(env.component.questionDocs.length).toEqual(0);
      env.waitForSliderUpdate();
    }));
  });

  describe('Questions', () => {
    it('questions are displaying', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      // A sixteenth question is archived
      expect(env.questions.length).toEqual(15);
      const question = env.selectQuestion(15);
      expect(env.getQuestionText(question)).toBe('Question relating to chapter 2');
    }));

    it('can select a question', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      const question = env.selectQuestion(1);
      expect(question.classes['mdc-list-item--activated']).toBeTruthy();
    }));

    it('question status change to read', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      let question = env.selectQuestion(2, false);
      expect(question.classes['question-read']).toBeFalsy();
      question = env.selectQuestion(3);
      expect(question.classes['question-read']).toBeTruthy();
    }));

    it('question status change to answered', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      const question = env.selectQuestion(2);
      env.answerQuestion('Answer question 2');
      expect(question.classes['question-answered']).toBeTruthy();
    }));

    it('question shows answers icon and total', fakeAsync(() => {
      env.setupAdminScenarioData();
      const question = env.selectQuestion(6, false);
      expect(env.getUnread(question)).toEqual(1);
      tick(env.questionReadTimer);
      env.fixture.detectChanges();
      expect(env.getUnread(question)).toEqual(0);
    }));

    it('unread questions badge is only visible when the setting is ON to see other answers', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      expect(env.getUnread(env.questions[6])).toEqual(4);
      env.component.projectDoc.submitJson0Op(op => op.set<boolean>(p => p.usersSeeEachOthersResponses, false), false);
      tick();
      env.fixture.detectChanges();
      expect(env.getUnread(env.questions[6])).toEqual(0);
    }));

    it('responds to remote question added', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      let question = env.selectQuestion(1);
      const questionId = env.component.questionsPanel.activeQuestionDoc.id;
      expect(env.questions.length).toEqual(15);
      const newQuestion: Question = {
        dataId: objectId(),
        ownerRef: env.adminUser.id,
        projectRef: 'project01',
        text: 'Admin just added a question.',
        answers: [],
        scriptureStart: { book: 'JHN', chapter: '1', verse: '10', versification: 'English' },
        scriptureEnd: { book: 'JHN', chapter: '1', verse: '11', versification: 'English' },
        isArchived: false,
        dateCreated: '',
        dateModified: ''
      };
      env.insertQuestion(newQuestion);
      env.waitForSliderUpdate();
      expect(env.component.questionsPanel.activeQuestionDoc.id).toBe(questionId);
      expect(env.questions.length).toEqual(16);
      question = env.selectQuestion(1);
      expect(env.getQuestionText(question)).toBe('Admin just added a question.');
    }));
  });

  describe('Answers', () => {
    it('answer panel is initiated and shows the first question', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      expect(env.answerPanel).toBeDefined();
    }));

    it('can answer a question', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      const question = env.selectQuestion(2);
      env.answerQuestion('Answer question 2');
      expect(env.answers.length).toEqual(1);
      expect(env.getAnswerText(0)).toBe('Answer question 2');
    }));

    it('opens dialog if answering a question for the first time', fakeAsync(() => {
      env.setupReviewerScenarioData(env.cleanCheckerUser);
      env.selectQuestion(2);
      env.answerQuestion('Answering question 2 should pop up a dialog');
      verify(env.mockedAccountService.openNameDialog(env.cleanCheckerUser.user.displayName, true)).once();
      expect(env.answers.length).toEqual(1);
      expect(env.getAnswerText(0)).toBe('Answering question 2 should pop up a dialog');
    }));

    it('inserts newer answer above older answers', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(7);
      env.answerQuestion('Just added answer');
      expect(env.answers.length).toEqual(2);
      expect(env.getAnswerText(0)).toBe('Just added answer');
      expect(env.getAnswerText(1)).toBe('Answer 7 on question');
    }));

    it('can cancel answering a question', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      const question = env.selectQuestion(2);
      env.clickButton(env.addAnswerButton);
      env.waitForSliderUpdate();
      expect(env.yourAnswerField).toBeDefined();
      env.clickButton(env.cancelAnswerButton);
      env.waitForSliderUpdate();
      expect(env.yourAnswerField).toBeNull();
      expect(env.addAnswerButton).toBeDefined();
    }));

    it('can change answering tabs', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      const question = env.selectQuestion(2);
      env.clickButton(env.addAnswerButton);
      env.waitForSliderUpdate();
      env.clickButton(env.audioTab);
      expect(env.recordButton).toBeDefined();
    }));

    it('check answering validation', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      const question = env.selectQuestion(2);
      env.clickButton(env.addAnswerButton);
      env.clickButton(env.saveAnswerButton);
      env.waitForSliderUpdate();
      expect(env.yourAnswerField.classes['mdc-text-field--invalid']).toBeTruthy();
    }));

    it('can edit an answer', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(7);
      env.answerQuestion('Answer question 7');
      expect(env.getAnswer(1).classes['answer-unread']).toBe(true);
      env.clickButton(env.getAnswerEditButton(0));
      env.setTextFieldValue(env.yourAnswerField, 'Edited question 7 answer');
      env.clickButton(env.saveAnswerButton);
      env.waitForSliderUpdate();
      expect(env.getAnswer(1).classes['answer-unread']).toBe(false);
      expect(env.getAnswerText(0)).toBe('Edited question 7 answer');
    }));

    it('can remove audio from answer', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(6);
      env.clickButton(env.getAnswerEditButton(0));
      env.waitForSliderUpdate();
      env.clickButton(env.audioTab);
      env.clickButton(env.removeAudioButton);
      env.clickButton(env.saveAnswerButton);
      env.waitForSliderUpdate();
      verify(env.mockedProjectService.onlineDeleteAudio('project01', 'a6Id', env.checkerUser.id)).once();
      expect().nothing();
    }));

    it('can delete an answer', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(6);
      expect(env.answers.length).toEqual(1);
      env.clickButton(env.answerDeleteButton(0));
      env.waitForSliderUpdate();
      expect(env.answers.length).toEqual(0);
      verify(env.mockedProjectService.onlineDeleteAudio('project01', 'a6Id', env.checkerUser.id)).once();
    }));

    it('can delete correct answer after changing chapters', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(2);
      env.answerQuestion('Answer question 2');
      env.component.chapter = env.component.chapter + 1;
      env.clickButton(env.answerDeleteButton(0));
      env.waitForSliderUpdate();
      expect(env.answers.length).toEqual(0);
    }));

    it('answers reset when changing questions', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(2);
      env.answerQuestion('Answer question 2');
      expect(env.answers.length).toEqual(1);
      env.selectQuestion(1);
      expect(env.answers.length).toEqual(0);
    }));

    it('can like and unlike an answer', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(1);
      env.answerQuestion('Answer question to be liked');
      expect(env.likeTotal).toBe(0);
      env.clickButton(env.likeButton);
      env.waitForSliderUpdate();
      expect(env.likeTotal).toBe(1);
      env.clickButton(env.likeButton);
      env.waitForSliderUpdate();
      expect(env.likeTotal).toBe(0);
    }));

    it('do not show answers until current user has submitted an answer', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(7);
      expect(env.answers.length).toBe(0);
      expect(env.getUnread(env.questions[6])).toEqual(4);
      env.answerQuestion('Answer from reviewer');
      expect(env.answers.length).toBe(2);
      expect(env.getUnread(env.questions[6])).toEqual(0);
    }));

    it('reviewer can only see their answers when the setting is OFF to see other answers', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.component.projectDoc.submitJson0Op(op => op.set<boolean>(p => p.usersSeeEachOthersResponses, false), false);
      tick();
      env.fixture.detectChanges();
      env.selectQuestion(6);
      expect(env.answers.length).toBe(1);
      env.selectQuestion(7);
      expect(env.answers.length).toBe(0);
      env.answerQuestion('Answer from reviewer');
      expect(env.answers.length).toBe(1);
    }));

    it('can add scripture to an answer', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(1);
      env.clickButton(env.addAnswerButton);
      env.setTextFieldValue(env.yourAnswerField, 'Answer question');
      env.clickButton(env.selectTextTab);
      expect(env.scriptureText).toBe(null);
      env.setTextFieldValue(env.scriptureStartField, 'JHN 1:3');
      expect(env.scriptureText).toBe('target: chapter 1, verse 3.');
      env.setTextFieldValue(env.scriptureEndField, 'JHN 1:4');
      expect(env.scriptureText).toBe('target: chapter 1, verse 3. target: chapter 1, verse 4.');
      env.clickButton(env.saveAnswerButton);
      env.waitForSliderUpdate();
      expect(env.getAnswerScriptureText(0)).toBe('target: chapter 1, verse 3. target: chapter 1, verse 4.(JHN 1:3-4)');
    }));

    it('can remove scripture from an answer', fakeAsync(() => {
      env.setupReviewerScenarioData(env.checkerUser);
      env.selectQuestion(6);
      expect(env.getAnswerScriptureText(0)).toBe('Quoted scripture(JHN 1:1)');
      env.clickButton(env.getAnswerEditButton(0));
      env.clickButton(env.selectTextTab);
      env.setTextFieldValue(env.scriptureTextField, '');
      env.clickButton(env.saveAnswerButton);
      env.waitForSliderUpdate();
      expect(env.getAnswerScripture(0)).toBeFalsy();
    }));

    describe('Comments', () => {
      it('can comment on an answer', fakeAsync(() => {
        env.setupReviewerScenarioData(env.checkerUser);
        env.selectQuestion(1);
        env.answerQuestion('Answer question to be commented on');
        env.commentOnAnswer(0, 'Response to answer');
        expect(env.getAnswerComments(0).length).toBe(1);
      }));

      it('can edit comment on an answer', fakeAsync(() => {
        env.setupReviewerScenarioData(env.checkerUser);
        // Answer a question in a chapter where chapters previous also have comments
        env.selectQuestion(15);
        env.answerQuestion('Answer question to be commented on');
        env.commentOnAnswer(0, 'Response to answer');
        env.clickButton(env.getEditCommentButton(0, 0));
        env.setTextFieldValue(env.getYourCommentField(0), 'Edited comment');
        env.clickButton(env.getSaveCommentButton(0));
        env.waitForSliderUpdate();
        expect(env.getAnswerCommentText(0, 0)).toBe('Edited comment');
        expect(env.getAnswerComments(0).length).toBe(1);
      }));

      it('can delete comment on an answer', fakeAsync(() => {
        env.setupReviewerScenarioData(env.checkerUser);
        env.selectQuestion(1);
        env.answerQuestion('Answer question to be commented on');
        env.commentOnAnswer(0, 'Response to answer');
        expect(env.getAnswerComments(0).length).toBe(1);
        env.clickButton(env.getDeleteCommentButton(0, 0));
        env.waitForSliderUpdate();
        expect(env.getAnswerComments(0).length).toBe(0);
      }));

      it('comments only appear on the relevant answer', fakeAsync(() => {
        env.setupReviewerScenarioData(env.checkerUser);
        env.selectQuestion(1);
        env.answerQuestion('Answer question to be commented on');
        env.commentOnAnswer(0, 'First comment');
        env.commentOnAnswer(0, 'Second comment');
        expect(env.getAnswerComments(0).length).toBe(2);
        env.selectQuestion(2);
        env.answerQuestion('Second answer question to be commented on');
        env.commentOnAnswer(0, 'Third comment');
        expect(env.getAnswerComments(0).length).toBe(1);
        expect(env.getAnswerCommentText(0, 0)).toBe('Third comment');
        env.selectQuestion(1);
        expect(env.getAnswerCommentText(0, 0)).toBe('First comment');
      }));

      it('comments display show more button', fakeAsync(() => {
        env.setupAdminScenarioData();
        // Show maximum of 3 comments before displaying 'show all' button
        env.selectQuestion(7);
        expect(env.getAnswerComments(0).length).toBe(3);
        expect(env.getShowAllCommentsButton(0)).toBeFalsy();
        expect(env.getAddCommentButton(0)).toBeTruthy();
        // If more than 3 comments then only show 2 initially along with `show all` button
        env.selectQuestion(8);
        expect(env.getAnswerComments(0).length).toBe(2);
        expect(env.getShowAllCommentsButton(0)).toBeTruthy();
        expect(env.getAddCommentButton(0)).toBeFalsy();
        env.clickButton(env.getShowAllCommentsButton(0));
        env.waitForSliderUpdate();
        // Once 'show all' button has been clicked then show all comments
        expect(env.getAnswerComments(0).length).toBe(4);
        expect(env.getShowAllCommentsButton(0)).toBeFalsy();
        expect(env.getAddCommentButton(0)).toBeTruthy();
      }));

      it('comments unread only mark as read when the show more button is clicked', fakeAsync(() => {
        env.setupAdminScenarioData();
        const question = env.selectQuestion(8, false);
        expect(env.getUnread(question)).toEqual(4);
        tick(env.questionReadTimer);
        env.fixture.detectChanges();
        expect(env.getUnread(question)).toEqual(2);
        env.clickButton(env.getShowAllCommentsButton(0));
        env.waitForSliderUpdate();
        expect(env.getUnread(question)).toEqual(0);
      }));

      it('displays comments in real-time', fakeAsync(() => {
        env.setupReviewerScenarioData(env.checkerUser);
        env.selectQuestion(1);
        env.answerQuestion('Admin will add a comment to this');
        expect(env.getAnswerComments(0).length).toEqual(0);
        const date: string = new Date().toJSON();
        const comment: Comment = {
          dataId: objectId(),
          ownerRef: env.adminUser.id,
          text: 'Comment left by admin',
          dateCreated: date,
          dateModified: date
        };
        env.component.questionsPanel.activeQuestionDoc.submitJson0Op(
          op => op.insert(q => q.answers[0].comments, 0, comment),
          false
        );
        env.waitForSliderUpdate();
        expect(env.getAnswerComments(0).length).toEqual(1);
      }));
    });
  });

  describe('Text', () => {
    it('can increase and decrease font size', fakeAsync(() => {
      env.setupAdminScenarioData();
      const editor = env.quillEditor;
      expect(editor.style.fontSize).toBe('1rem');
      env.clickButton(env.increaseFontSizeButton);
      expect(editor.style.fontSize).toBe('1.1rem');
      env.clickButton(env.decreaseFontSizeButton);
      expect(editor.style.fontSize).toBe('1rem');
    }));

    it('can select a question from the text', fakeAsync(() => {
      env.setupAdminScenarioData();
      env.quillEditor.querySelector('usx-segment[data-segment=verse_1_3]').dispatchEvent(new Event('click'));
      env.waitForSliderUpdate();
      tick(env.questionReadTimer);
      env.fixture.detectChanges();
      expect(env.currentQuestion).toBe(4);
    }));
  });
});

interface UserInfo {
  id: string;
  user: User;
  role: string;
}

class TestEnvironment {
  component: CheckingComponent;
  fixture: ComponentFixture<CheckingComponent>;
  questionReadTimer: number = 2000;

  readonly mockedCheckingNameDialogRef: MdcDialogRef<EditNameDialogComponent> = mock(MdcDialogRef);
  readonly mockedAccountService = mock(AccountService);
  readonly mockedUserService = mock(UserService);
  readonly mockedProjectService = mock(SFProjectService);
  readonly mockedNoticeService = mock(NoticeService);

  adminUser = this.createUser('01', SFProjectRole.ParatextAdministrator);
  checkerUser = this.createUser('02', SFProjectRole.CommunityChecker);
  cleanCheckerUser = this.createUser('03', SFProjectRole.CommunityChecker, false);

  private adminProjectUserConfig: SFProjectUserConfig = {
    ownerRef: this.adminUser.id,
    projectRef: 'project01',
    questionRefsRead: [],
    answerRefsRead: [],
    commentRefsRead: []
  };

  private reviewerProjectUserConfig: SFProjectUserConfig = {
    ownerRef: this.checkerUser.id,
    projectRef: 'project01',
    questionRefsRead: [],
    answerRefsRead: [],
    commentRefsRead: []
  };

  private cleanReviewerProjectUserConfig: SFProjectUserConfig = {
    ownerRef: this.cleanCheckerUser.id,
    projectRef: 'project01',
    questionRefsRead: [],
    answerRefsRead: [],
    commentRefsRead: []
  };

  private testProject: SFProject = {
    name: 'Project 01',
    usersSeeEachOthersResponses: true,
    checkingEnabled: true,
    shareEnabled: true,
    shareLevel: SharingLevel.Anyone,
    texts: [
      {
        bookId: 'JHN',
        name: 'John',
        hasSource: false,
        chapters: [{ number: 1, lastVerse: 18 }, { number: 2, lastVerse: 25 }]
      }
    ],
    userRoles: {
      [this.adminUser.id]: this.adminUser.role,
      [this.checkerUser.id]: this.checkerUser.role,
      [this.cleanCheckerUser.id]: this.cleanCheckerUser.role
    }
  };

  private readonly realtimeService = new TestRealtimeService(SF_REALTIME_DOC_TYPES);
  private questionsQuery: RealtimeQuery<QuestionDoc>;

  constructor() {
    TestBed.configureTestingModule({
      declarations: [
        AudioTimePipe,
        CheckingAnswersComponent,
        CheckingAudioCombinedComponent,
        CheckingAudioPlayerComponent,
        CheckingAudioRecorderComponent,
        CheckingCommentFormComponent,
        CheckingCommentsComponent,
        CheckingComponent,
        CheckingOwnerComponent,
        CheckingQuestionsComponent,
        CheckingTextComponent,
        FontSizeComponent,
        ShareComponent,
        ShareControlComponent,
        ShareDialogComponent
      ],
      imports: [
        AngularSplitModule.forRoot(),
        ngfModule,
        NoopAnimationsModule,
        RouterTestingModule,
        AvatarTestingModule,
        SharedModule,
        UICommonModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { params: of({ projectId: 'project01', bookId: 'JHN' }) }
        },
        { provide: AccountService, useFactory: () => instance(this.mockedAccountService) },
        { provide: UserService, useFactory: () => instance(this.mockedUserService) },
        { provide: ProjectService, useFactory: () => instance(this.mockedProjectService) },
        { provide: SFProjectService, useFactory: () => instance(this.mockedProjectService) },
        { provide: NoticeService, useFactory: () => instance(this.mockedNoticeService) }
      ]
    });
  }

  get answerPanel(): DebugElement {
    return this.fixture.debugElement.query(By.css('#answer-panel'));
  }

  get answers(): DebugElement[] {
    return this.fixture.debugElement.queryAll(By.css('#answer-panel .answers-container .answer'));
  }

  get addAnswerButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('#add-answer'));
  }

  get cancelAnswerButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('#cancel-answer'));
  }

  get currentQuestion(): number {
    const questions = this.questions;
    for (const questionNumber in questions) {
      if (
        questions[questionNumber].classes.hasOwnProperty('mdc-list-item--activated') &&
        questions[questionNumber].classes['mdc-list-item--activated'] === true
      ) {
        // Need to add one as css selector nth-child starts index from 1 instead of zero
        return Number(questionNumber) + 1;
      }
    }
    return -1;
  }

  get decreaseFontSizeButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('app-font-size mdc-menu-surface button:first-child'));
  }

  get increaseFontSizeButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('app-font-size mdc-menu-surface button:last-child'));
  }

  get likeButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('#like-answer'));
  }

  get likeTotal(): number {
    return parseInt(
      this.fixture.debugElement.query(By.css('.answers-container .answer .like-count')).nativeElement.textContent,
      10
    );
  }

  get nextButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('#project-navigation .next-question'));
  }

  get previousButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('#project-navigation .prev-question'));
  }

  get questions(): DebugElement[] {
    return this.fixture.debugElement.queryAll(By.css('#questions-panel .mdc-list-item'));
  }

  get quillEditor(): HTMLElement {
    return <HTMLElement>document.getElementsByClassName('ql-container')[0];
  }

  get recordButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('#answer-form button.record'));
  }

  get audioTab(): DebugElement {
    return this.fixture.debugElement.query(By.css('#answer-form mdc-tab:nth-child(2)'));
  }

  get removeAudioButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('.remove-audio-file'));
  }

  get saveAnswerButton(): DebugElement {
    return this.fixture.debugElement.query(By.css('#save-answer'));
  }

  get yourAnswerField(): DebugElement {
    return this.fixture.debugElement.query(By.css('mdc-text-field[formControlName="answerText"]'));
  }

  get scriptureStartField(): DebugElement {
    return this.fixture.debugElement.query(By.css('mdc-text-field[formControlName="scriptureStart"]'));
  }

  get scriptureEndField(): DebugElement {
    return this.fixture.debugElement.query(By.css('mdc-text-field[formControlName="scriptureEnd"]'));
  }

  get scriptureTextField(): DebugElement {
    return this.fixture.debugElement.query(By.css('mdc-text-field[formControlName="scriptureText"]'));
  }

  get scriptureText(): string {
    return this.component.answersPanel.scriptureText.value;
  }

  get selectTextTab(): DebugElement {
    return this.fixture.debugElement.query(By.css('#answer-form mdc-tab:nth-child(3)'));
  }

  answerQuestion(answer: string): void {
    this.clickButton(this.addAnswerButton);
    this.setTextFieldValue(this.yourAnswerField, answer);
    this.clickButton(this.saveAnswerButton);
    this.waitForSliderUpdate();
  }

  clickButton(button: DebugElement): void {
    button.nativeElement.click();
    this.fixture.detectChanges();
  }

  commentOnAnswer(answerIndex: number, comment: string): void {
    this.clickButton(this.getAddCommentButton(answerIndex));
    this.setTextFieldValue(this.getYourCommentField(answerIndex), comment);
    this.clickButton(this.getSaveCommentButton(answerIndex));
    this.waitForSliderUpdate();
  }

  getAnswer(index: number): DebugElement {
    return this.answers[index];
  }

  answerDeleteButton(index: number): DebugElement {
    return this.getAnswer(index).query(By.css('.answer-delete'));
  }

  getAnswerEditButton(index: number): DebugElement {
    return this.getAnswer(index).query(By.css('.answer-edit'));
  }

  getAnswerText(index: number): string {
    return this.getAnswer(index).query(By.css('.answer-text')).nativeElement.textContent;
  }

  getAnswerScripture(index: number): DebugElement {
    return this.getAnswer(index).query(By.css('.answer-scripture'));
  }

  getAnswerScriptureText(index: number): string {
    return this.getAnswerScripture(index).nativeElement.textContent;
  }

  getAddCommentButton(answerIndex: number): DebugElement {
    return this.getAnswer(answerIndex).query(By.css('.add-comment'));
  }

  getAnswerComments(answerIndex: number): DebugElement[] {
    return this.getAnswer(answerIndex).queryAll(By.css('.comment'));
  }

  getAnswerComment(answerIndex: number, commentIndex: number): DebugElement {
    return this.getAnswerComments(answerIndex)[commentIndex];
  }

  getAnswerCommentText(answerIndex: number, commentIndex: number): string {
    const commentText = this.getAnswerComment(answerIndex, commentIndex);
    return commentText.query(By.css('.comment-text')).nativeElement.textContent;
  }

  getDeleteCommentButton(answerIndex: number, commentIndex: number): DebugElement {
    return this.getAnswerComments(answerIndex)[commentIndex].query(By.css('.comment-delete'));
  }

  getEditCommentButton(answerIndex: number, commentIndex: number): DebugElement {
    return this.getAnswerComments(answerIndex)[commentIndex].query(By.css('.comment-edit'));
  }

  getQuestionText(question: DebugElement): string {
    return question.query(By.css('.question-title')).nativeElement.textContent;
  }

  getSaveCommentButton(answerIndex: number): DebugElement {
    return this.getAnswer(answerIndex).query(By.css('.save-comment'));
  }

  getUnread(question: DebugElement): number {
    return parseInt(question.query(By.css('.view-answers span')).nativeElement.textContent, 10);
  }

  getYourCommentField(answerIndex: number): DebugElement {
    return this.getAnswer(answerIndex).query(By.css('mdc-text-field[formControlName="commentText"]'));
  }

  selectQuestion(questionNumber: number, includeReadTimer: boolean = true): DebugElement {
    const question = this.fixture.debugElement.query(
      By.css('#questions-panel .mdc-list-item:nth-child(' + questionNumber + ')')
    );
    question.nativeElement.click();
    tick(1);
    this.fixture.detectChanges();
    if (includeReadTimer) {
      tick(this.questionReadTimer);
      this.fixture.detectChanges();
    }
    return question;
  }

  setTextFieldValue(textField: DebugElement, value: string): void {
    const input = textField.query(By.css('input'));
    const inputElem = input.nativeElement as HTMLInputElement;
    inputElem.value = value;
    inputElem.dispatchEvent(new Event('input'));
    inputElem.dispatchEvent(new Event('change'));
    this.fixture.detectChanges();
    tick();
  }

  getShowAllCommentsButton(answerIndex: number): DebugElement {
    return this.getAnswer(answerIndex).query(By.css('.show-all-comments'));
  }

  waitForSliderUpdate(): void {
    tick(100);
    this.fixture.detectChanges();
  }

  setupAdminScenarioData(): void {
    this.setupDefaultProjectData(this.adminUser);
    this.initComponentEnviroment();
  }

  setupReviewerScenarioData(user: UserInfo): void {
    this.setupDefaultProjectData(user);
    this.initComponentEnviroment();
  }

  insertQuestion(newQuestion: Question): void {
    const docId = getQuestionDocId('project01', newQuestion.dataId);
    this.realtimeService.addSnapshot(QuestionDoc.COLLECTION, {
      id: docId,
      data: newQuestion
    });
    const adapter = this.questionsQuery.adapter as MemoryRealtimeQueryAdapter;
    adapter.insert$.next({ index: 0, docIds: [docId] });
  }

  private setupDefaultProjectData(user: UserInfo): void {
    this.realtimeService.addSnapshots<SFProject>(SFProjectDoc.COLLECTION, [
      {
        id: 'project01',
        data: this.testProject
      }
    ]);
    when(this.mockedProjectService.get(anything())).thenCall(id =>
      this.realtimeService.subscribe<SFProjectDoc>(SFProjectDoc.COLLECTION, id)
    );

    this.realtimeService.addSnapshots<SFProjectUserConfig>(SFProjectUserConfigDoc.COLLECTION, [
      {
        id: getSFProjectUserConfigDocId('project01', this.adminUser.id),
        data: this.adminProjectUserConfig
      },
      {
        id: getSFProjectUserConfigDocId('project01', this.checkerUser.id),
        data: this.reviewerProjectUserConfig
      },
      {
        id: getSFProjectUserConfigDocId('project01', this.cleanCheckerUser.id),
        data: this.cleanReviewerProjectUserConfig
      }
    ]);
    when(this.mockedProjectService.getUserConfig(anything(), anything())).thenCall((id, userId) =>
      this.realtimeService.subscribe<SFProjectUserConfigDoc>(
        SFProjectUserConfigDoc.COLLECTION,
        getSFProjectUserConfigDocId(id, userId)
      )
    );

    this.realtimeService.addSnapshots<TextData>(TextDoc.COLLECTION, [
      {
        id: getTextDocId('project01', 'JHN', 1),
        data: this.createTextData(),
        type: RichText.type.name
      },
      {
        id: getTextDocId('project01', 'JHN', 2),
        data: this.createTextData(),
        type: RichText.type.name
      }
    ]);
    when(this.mockedProjectService.getText(anything())).thenCall(id =>
      this.realtimeService.subscribe<TextDoc>(TextDoc.COLLECTION, id.toString())
    );

    const dateNow: string = new Date().toJSON();
    const questions: Partial<Snapshot<Question>>[] = [];
    for (let questionNumber = 1; questionNumber <= 14; questionNumber++) {
      questions.push({
        id: getQuestionDocId('project01', `q${questionNumber}Id`),
        data: {
          dataId: 'q' + questionNumber + 'Id',
          ownerRef: this.adminUser.id,
          projectRef: 'project01',
          text: 'Book 1, Q' + questionNumber + ' text',
          scriptureStart: { book: 'JHN', chapter: '1', verse: '1', versification: 'English' },
          scriptureEnd: { book: 'JHN', chapter: '1', verse: '2', versification: 'English' },
          answers: [],
          isArchived: false,
          dateCreated: dateNow,
          dateModified: dateNow
        }
      });
    }
    questions.push({
      id: getQuestionDocId('project01', 'q15Id'),
      data: {
        dataId: 'q15Id',
        ownerRef: this.adminUser.id,
        projectRef: 'project01',
        text: 'Question relating to chapter 2',
        scriptureStart: { book: 'JHN', chapter: '2', verse: '1', versification: 'English' },
        scriptureEnd: { book: 'JHN', chapter: '2', verse: '2', versification: 'English' },
        answers: [],
        isArchived: false,
        dateCreated: dateNow,
        dateModified: dateNow
      }
    });
    questions[3].data.scriptureStart.verse = '3';
    questions[3].data.scriptureEnd.verse = '4';
    questions[5].data.answers.push({
      dataId: 'a6Id',
      ownerRef: this.checkerUser.id,
      text: 'Answer 6 on question',
      scriptureStart: { chapter: '1', verse: '1', book: 'JHN', versification: 'English' },
      scriptureEnd: { chapter: '1', verse: '1', book: 'JHN', versification: 'English' },
      scriptureText: 'Quoted scripture',
      likes: [],
      dateCreated: dateNow,
      dateModified: dateNow,
      audioUrl: 'file://audio.mp3',
      comments: []
    });

    const a7Comments: Comment[] = [];
    for (let commentNumber = 1; commentNumber <= 3; commentNumber++) {
      a7Comments.push({
        dataId: 'c' + commentNumber + 'Id',
        ownerRef: this.adminUser.id,
        text: 'Comment ' + commentNumber + ' on question 7',
        dateCreated: dateNow,
        dateModified: dateNow
      });
    }
    questions[6].data.answers.push({
      dataId: 'a7Id',
      ownerRef: this.adminUser.id,
      text: 'Answer 7 on question',
      likes: [],
      dateCreated: dateNow,
      dateModified: dateNow,
      comments: a7Comments
    });

    const a8Comments: Comment[] = [];
    for (let commentNumber = 1; commentNumber <= 4; commentNumber++) {
      a8Comments.push({
        dataId: 'c' + commentNumber + 'Id',
        ownerRef: this.checkerUser.id,
        text: 'Comment ' + commentNumber + ' on question 8',
        dateCreated: dateNow,
        dateModified: dateNow
      });
    }
    questions[7].data.answers.push({
      dataId: 'a8Id',
      ownerRef: this.adminUser.id,
      text: 'Answer 8 on question',
      likes: [],
      dateCreated: dateNow,
      dateModified: dateNow,
      comments: a8Comments
    });
    this.realtimeService.addSnapshots<Question>(QuestionDoc.COLLECTION, questions);
    this.questionsQuery = this.realtimeService.createQuery(QuestionDoc.COLLECTION, {});
    this.questionsQuery.subscribe();
    when(
      this.mockedProjectService.getQuestions('project01', deepEqual({ bookId: 'JHN', activeOnly: true, sort: true }))
    ).thenResolve(this.questionsQuery);
    when(this.mockedUserService.currentUserId).thenReturn(user.id);

    this.realtimeService.addSnapshots<User>(UserDoc.COLLECTION, [
      {
        id: user.id,
        data: user.user
      }
    ]);
    when(this.mockedUserService.getCurrentUser()).thenReturn(
      this.realtimeService.subscribe(UserDoc.COLLECTION, user.id)
    );

    this.realtimeService.addSnapshots<User>(UserProfileDoc.COLLECTION, [
      {
        id: this.adminUser.id,
        data: this.adminUser.user
      },
      {
        id: this.checkerUser.id,
        data: this.checkerUser.user
      }
    ]);
    when(this.mockedUserService.getProfile(anything())).thenCall(id =>
      this.realtimeService.subscribe(UserProfileDoc.COLLECTION, id)
    );

    when(this.mockedAccountService.openNameDialog(anything(), anything())).thenReturn(
      instance(this.mockedCheckingNameDialogRef)
    );

    when(this.mockedCheckingNameDialogRef.afterClosed()).thenReturn(of(user.user.displayName));
  }

  private initComponentEnviroment(): void {
    this.fixture = TestBed.createComponent(CheckingComponent);
    this.component = this.fixture.componentInstance;
    // Need to wait for questions and text promises to finish
    this.fixture.detectChanges();
    tick(1);
    this.fixture.detectChanges();
    tick(this.questionReadTimer);
    this.fixture.detectChanges();
  }

  private createUser(id: string, role: string, nameConfirmed: boolean = true): UserInfo {
    return {
      id: 'user' + id,
      user: {
        displayName: 'User ' + id,
        isDisplayNameConfirmed: nameConfirmed
      },
      role
    };
  }

  private createTextData(): TextData {
    const delta = new Delta();
    delta.insert({ chapter: { number: '1', style: 'c' } });
    delta.insert({ verse: { number: '1', style: 'v' } });
    delta.insert('target: chapter 1, verse 1.', { segment: 'verse_1_1' });
    delta.insert({ verse: { number: '2', style: 'v' } });
    delta.insert({ blank: 'normal' }, { segment: 'verse_1_2' });
    delta.insert('\n', { para: { style: 'p' } });
    delta.insert({ verse: { number: '3', style: 'v' } });
    delta.insert(`target: chapter 1, verse 3.`, { segment: 'verse_1_3' });
    delta.insert({ verse: { number: '4', style: 'v' } });
    delta.insert(`target: chapter 1, verse 4.`, { segment: 'verse_1_4' });
    delta.insert('\n', { para: { style: 'p' } });
    delta.insert({ blank: 'initial' }, { segment: 'verse_1_4/p_1' });
    delta.insert({ verse: { number: '5', style: 'v' } });
    delta.insert(`target: chapter 1, `, { segment: 'verse_1_5' });
    delta.insert('\n', { para: { style: 'p' } });
    return delta;
  }
}
