import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import cloneDeep from 'lodash/cloneDeep';
import sortBy from 'lodash/sortBy';
import { Answer } from 'realtime-server/lib/scriptureforge/models/answer';
import { Comment } from 'realtime-server/lib/scriptureforge/models/comment';
import { SFProject } from 'realtime-server/lib/scriptureforge/models/sf-project';
import { SFProjectRole } from 'realtime-server/lib/scriptureforge/models/sf-project-role';
import { UserService } from 'xforge-common/user.service';
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
export class CheckingCommentsComponent implements OnInit {
  @Input() project: SFProject;
  @Input() projectUserConfigDoc: SFProjectUserConfigDoc;
  @Output() action: EventEmitter<CommentAction> = new EventEmitter<CommentAction>();
  @Input() answer: Answer;

  activeComment: Comment;
  commentFormVisible: boolean = false;
  maxCommentsToShow: number = 3;
  showAllComments: boolean = false;
  private initUserCommentRefsRead: string[] = [];

  constructor(private userService: UserService) {}

  get isAdministrator(): boolean {
    if (this.project == null || this.projectUserConfigDoc == null || !this.projectUserConfigDoc.isLoaded) {
      return false;
    }
    return this.project.userRoles[this.projectUserConfigDoc.data.ownerRef] === SFProjectRole.ParatextAdministrator;
  }

  get showMoreCommentsLabel(): string {
    const comments = this.getSortedComments();
    let label = 'Show ' + (comments.length - (this.maxCommentsToShow - 1)) + ' more comments';
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
    label += unread ? ' - ' + unread + ' unread' : '';
    return label;
  }

  get commentCount(): number {
    return this.answer != null ? this.answer.comments.length : 0;
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

  hasPermission(comment: Comment, permission: string): boolean {
    if (this.userService.currentUserId === comment.ownerRef) {
      return true;
    } else if (permission === 'delete' && this.isAdministrator) {
      return true;
    }
    return false;
  }

  hasUserReadComment(comment: Comment): boolean {
    return (
      this.initUserCommentRefsRead.includes(comment.dataId) ||
      this.projectUserConfigDoc.data.ownerRef === comment.ownerRef
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
    this.initUserCommentRefsRead = cloneDeep(this.projectUserConfigDoc.data.commentRefsRead);
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
      text: text,
      comment: this.activeComment
    });
    this.hideCommentForm();
    this.showAllComments = true;
  }
}
