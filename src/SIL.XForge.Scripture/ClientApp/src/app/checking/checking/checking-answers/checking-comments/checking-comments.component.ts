import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { translate } from '@ngneat/transloco';
import cloneDeep from 'lodash-es/cloneDeep';
import sortBy from 'lodash-es/sortBy';
import { Operation } from 'realtime-server/lib/esm/common/models/project-rights';
import { Answer } from 'realtime-server/lib/esm/scriptureforge/models/answer';
import { Comment } from 'realtime-server/lib/esm/scriptureforge/models/comment';
import { SFProjectProfile } from 'realtime-server/lib/esm/scriptureforge/models/sf-project';
import { SFProjectDomain, SF_PROJECT_RIGHTS } from 'realtime-server/lib/esm/scriptureforge/models/sf-project-rights';
import { debounceTime } from 'rxjs/operators';
import { SubscriptionDisposable } from 'xforge-common/subscription-disposable';
import { UserService } from 'xforge-common/user.service';
import { QuestionDoc } from '../../../../core/models/question-doc';
import { SFProjectUserConfigDoc } from '../../../../core/models/sf-project-user-config-doc';

export interface CommentAction {
  action: 'delete' | 'save' | 'show-form' | 'hide-form' | 'show-comments';
  comment?: Comment;
  answer?: Answer;
  text?: string;
}

@Component({
  selector: 'app-checking-comments',
  templateUrl: './checking-comments.component.html',
  styleUrls: ['./checking-comments.component.scss']
})
export class CheckingCommentsComponent extends SubscriptionDisposable implements OnInit {
  @Input() project?: SFProjectProfile;
  @Input() projectUserConfigDoc?: SFProjectUserConfigDoc;
  @Input() questionDoc?: QuestionDoc;
  @Output() action: EventEmitter<CommentAction> = new EventEmitter<CommentAction>();
  @Input() answer?: Answer;

  activeComment?: Comment;
  commentFormVisible: boolean = false;
  readonly maxCommentsToShow: number = 3;
  showAllComments: boolean = false;
  private initUserCommentRefsRead: string[] = [];

  constructor(private userService: UserService) {
    super();
  }

  get showMoreCommentsLabel(): string {
    const comments = this.getSortedComments();
    const count = comments.length - (this.maxCommentsToShow - 1);
    let counter = 1;
    let unread = 0;
    for (const comment of comments) {
      if (counter >= this.maxCommentsToShow) {
        if (!this.hasUserReadComment(comment)) {
          unread++;
        }
      }
      counter++;
    }

    if (unread > 0) {
      return translate('checking_comments.show_more_comments_and_unread', { count, unread });
    } else {
      return translate('checking_comments.show_more_comments', { count });
    }
  }

  get commentCount(): number {
    return this.answer != null ? this.answer.comments.length : 0;
  }

  get canAddComment(): boolean {
    const userId = this.userService.currentUserId;
    return (
      this.project != null &&
      SF_PROJECT_RIGHTS.hasRight(this.project, userId, SFProjectDomain.AnswerComments, Operation.Create)
    );
  }

  getSortedComments(): Comment[] {
    return this.answer != null ? sortBy(this.answer.comments, c => c.dateCreated) : [];
  }

  editComment(comment: Comment) {
    this.activeComment = cloneDeep(comment);
    this.showCommentForm();
  }

  deleteComment(comment: Comment) {
    this.action.emit({
      action: 'delete',
      answer: this.answer,
      comment: comment
    });
  }

  canEditComment(comment: Comment): boolean {
    const userId = this.userService.currentUserId;
    return (
      this.project != null &&
      SF_PROJECT_RIGHTS.hasRight(this.project, userId, SFProjectDomain.AnswerComments, Operation.Edit, comment)
    );
  }

  canDeleteComment(comment: Comment): boolean {
    const userId = this.userService.currentUserId;
    return (
      this.project != null &&
      SF_PROJECT_RIGHTS.hasRight(this.project, userId, SFProjectDomain.AnswerComments, Operation.Delete, comment)
    );
  }

  hasUserReadComment(comment: Comment): boolean {
    return (
      this.initUserCommentRefsRead.includes(comment.dataId) ||
      (this.projectUserConfigDoc != null &&
        this.projectUserConfigDoc.data != null &&
        this.projectUserConfigDoc.data.ownerRef === comment.ownerRef)
    );
  }

  hideCommentForm() {
    this.commentFormVisible = false;
    this.activeComment = undefined;
    this.action.emit({
      action: 'hide-form'
    });
  }

  ngOnInit(): void {
    if (this.projectUserConfigDoc != null && this.projectUserConfigDoc.data != null) {
      this.initUserCommentRefsRead = cloneDeep(this.projectUserConfigDoc.data.commentRefsRead);
    }
    if (this.questionDoc != null) {
      // Give the user two seconds before marking the comment as read. This also prevents SF-624 - prematurely
      // marking a remotely added comment as read
      this.subscribe(this.questionDoc.remoteChanges$.pipe(debounceTime(2000)), () => {
        if (this.projectUserConfigDoc == null || this.projectUserConfigDoc.data == null || this.answer == null) {
          return;
        }
        const defaultCommentsToShow =
          this.answer.comments.length > this.maxCommentsToShow
            ? this.maxCommentsToShow - 1
            : this.answer.comments.length;
        const commentsToShow = this.showAllComments ? this.answer.comments.length : defaultCommentsToShow;
        const commentIdsToMarkRead: string[] = [];
        let commentNumber = 1;
        // Older comments are displayed above newer comments, so iterate over comments starting with the oldest
        for (const comment of this.getSortedComments()) {
          if (!this.projectUserConfigDoc.data.commentRefsRead.includes(comment.dataId)) {
            commentIdsToMarkRead.push(comment.dataId);
          }
          commentNumber++;
          if (commentNumber > commentsToShow) {
            break;
          }
        }
        if (commentIdsToMarkRead.length) {
          this.projectUserConfigDoc.submitJson0Op(op => {
            for (const commentId of commentIdsToMarkRead) {
              op.add(puc => puc.commentRefsRead, commentId);
            }
          });
        }
      });
    }
  }

  showComments(): void {
    this.showAllComments = true;
    this.action.emit({
      action: 'show-comments',
      answer: this.answer
    });
  }

  showCommentForm() {
    this.commentFormVisible = true;
    this.action.emit({
      action: 'show-form'
    });
  }

  submit(text: string): void {
    this.action.emit({
      action: 'save',
      answer: this.answer,
      text,
      comment: this.activeComment
    });
    this.hideCommentForm();
    this.showAllComments = true;
  }
}
