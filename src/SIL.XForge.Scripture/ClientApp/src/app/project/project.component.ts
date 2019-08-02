import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { SubscriptionDisposable } from 'xforge-common/subscription-disposable';
import { UserService } from 'xforge-common/user.service';
import { canTranslate } from '../core/models/sfproject-roles';
import { SFProjectService } from '../core/sfproject.service';

@Component({
  selector: 'app-projects',
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.scss']
})
export class ProjectComponent extends SubscriptionDisposable implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly projectService: SFProjectService,
    private readonly router: Router,
    private readonly userService: UserService
  ) {
    super();
  }

  ngOnInit(): void {
    this.subscribe(
      this.route.params.pipe(
        map(params => params['projectId'] as string),
        distinctUntilChanged(),
        filter(projectId => projectId != null)
      ),
      async projectId => {
        // if the link has sharing turned on, check if the current user needs to be added to the project
        const sharing = this.route.snapshot.queryParams['sharing'] as string;
        if (sharing === 'true') {
          const shareKey = this.route.snapshot.queryParams['shareKey'] as string;
          await this.projectService.onlineCheckLinkSharing(projectId, shareKey);
        }
        const projectUserConfigDoc = await this.projectService.getUserConfig(projectId, this.userService.currentUserId);
        const projectUserConfig = projectUserConfigDoc.data;
        // navigate to last location
        if (
          projectUserConfig != null &&
          projectUserConfig.selectedTask != null &&
          projectUserConfig.selectedTask !== ''
        ) {
          // the user has previously navigated to a location in a task
          const bookId = projectUserConfig.selectedBookId;
          if (bookId != null) {
            this.router.navigate(['./', projectUserConfig.selectedTask, bookId], {
              relativeTo: this.route,
              replaceUrl: true
            });
          }
        } else {
          const projectDoc = await this.projectService.get(projectId);
          const project = projectDoc.data;
          if (project != null && project.texts != null && project.texts.length > 0) {
            const projectRole = project.userRoles[this.userService.currentUserId];
            // the user has not navigated anywhere before, so navigate to the default location in the first enabled task
            let task: string;
            if (project.translateEnabled != null && project.translateEnabled && canTranslate(projectRole)) {
              task = 'translate';
            } else if (project.checkingEnabled != null && project.checkingEnabled) {
              task = 'checking';
            }
            if (task != null) {
              this.router.navigate(['./', task, project.texts[0].bookId], {
                relativeTo: this.route,
                replaceUrl: true
              });
            }
          }
        }
      }
    );
  }
}
