import { MdcDialog, MdcDialogRef } from '@angular-mdc/web/dialog';
import { Injectable } from '@angular/core';
import { escapeRegExp } from 'lodash-es';
import merge from 'lodash-es/merge';
import { User } from 'realtime-server/lib/esm/common/models/user';
import { obj } from 'realtime-server/lib/esm/common/utils/obj-path';
import { combineLatest, from, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';
import { CommandService } from './command.service';
import { EditNameDialogComponent, EditNameDialogResult } from './edit-name-dialog/edit-name-dialog.component';
import { LocalSettingsService } from './local-settings.service';
import { RealtimeQuery } from './models/realtime-query';
import { UserDoc } from './models/user-doc';
import { UserProfileDoc } from './models/user-profile-doc';
import { Filters, QueryParameters } from './query-parameters';
import { RealtimeService } from './realtime.service';
import { USERS_URL } from './url-constants';

export const CURRENT_PROJECT_ID_SETTING = 'current_project_id';

/**
 * Provides operations on user objects.
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  // TODO: if/when we enable another xForge site, remove this and get the component to provide the site info
  private siteId: string = environment.siteId;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly authService: AuthService,
    private readonly commandService: CommandService,
    private readonly localSettings: LocalSettingsService,
    private readonly dialog: MdcDialog
  ) {}

  get currentUserId(): string {
    return this.authService.currentUserId == null ? '' : this.authService.currentUserId;
  }

  currentProjectId(user: UserDoc): string | undefined {
    return this.localSettings.get(CURRENT_PROJECT_ID_SETTING) ?? user.data?.sites?.[this.siteId].currentProjectId;
  }

  async setCurrentProjectId(user: UserDoc, value: string | undefined): Promise<void> {
    this.localSettings.set(CURRENT_PROJECT_ID_SETTING, value);
    if (user.data?.sites[this.siteId].currentProjectId === value) {
      return;
    }
    await user.submitJson0Op(update => {
      if (value != null) {
        update.set(u => u.sites[this.siteId].currentProjectId, value);
      } else {
        update.unset(u => u.sites[this.siteId].currentProjectId);
      }
    });
  }

  /** Get currently-logged in user. */
  getCurrentUser(): Promise<UserDoc> {
    return this.get(this.currentUserId);
  }

  get(id: string): Promise<UserDoc> {
    return this.realtimeService.subscribe(UserDoc.COLLECTION, id);
  }

  getProfile(id: string): Promise<UserProfileDoc> {
    return this.realtimeService.subscribe(UserProfileDoc.COLLECTION, id);
  }

  async onlineDelete(id: string): Promise<void> {
    await this.onlineInvoke('delete', { userId: id });
  }

  onlineQuery(
    term$: Observable<string>,
    queryParameters$: Observable<QueryParameters>,
    reload$: Observable<void>
  ): Observable<RealtimeQuery<UserDoc>> {
    const debouncedTerm$ = term$.pipe(debounceTime(400), distinctUntilChanged());

    return combineLatest([debouncedTerm$, queryParameters$, reload$]).pipe(
      switchMap(([term, queryParameters]) => {
        term = escapeRegExp(term.trim());
        let filters: Filters = {};
        if (term.length > 0) {
          filters = {
            $or: [
              { [obj<User>().pathStr(u => u.name)]: { $regex: `.*${term}.*`, $options: 'i' } },
              { [obj<User>().pathStr(u => u.email)]: { $regex: `.*${term}.*`, $options: 'i' } },
              { [obj<User>().pathStr(u => u.displayName)]: { $regex: `.*${term}.*`, $options: 'i' } }
            ]
          };
        }
        return from(this.realtimeService.onlineQuery<UserDoc>(UserDoc.COLLECTION, merge(filters, queryParameters)));
      })
    );
  }

  async editDisplayName(isConfirmation: boolean): Promise<void> {
    const currentUserDoc = await this.getCurrentUser();
    if (currentUserDoc.data == null) {
      return;
    }
    const dialogRef = this.dialog.open(EditNameDialogComponent, {
      data: { name: currentUserDoc.data.displayName, isConfirmation },
      escapeToClose: !isConfirmation,
      clickOutsideToClose: !isConfirmation
    }) as MdcDialogRef<EditNameDialogComponent, EditNameDialogResult | 'close'>;
    const result = await dialogRef.afterClosed().toPromise();
    if (result != null && result !== 'close') {
      await currentUserDoc.submitJson0Op(op => {
        op.set(u => u.displayName, result.displayName);
        op.set<boolean>(u => u.isDisplayNameConfirmed, true);
      });
    }
  }

  async userMigrationComplete(): Promise<void> {
    await this.onlineInvoke('userMigrationComplete', { userId: this.currentUserId });
  }

  private onlineInvoke<T>(method: string, params?: any): Promise<T | undefined> {
    return this.commandService.onlineInvoke<T>(USERS_URL, method, params);
  }
}
