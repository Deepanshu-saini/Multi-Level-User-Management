import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface TreeNode {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    balance: number;
    isActive: boolean;
    createdAt: Date;
  };
  children: TreeNode[];
}

@Component({
  selector: 'app-user-hierarchy',
  templateUrl: './user-hierarchy.component.html',
  styleUrls: ['./user-hierarchy.component.scss']
})
export class UserHierarchyComponent implements OnInit {
  userId?: string;
  tree: TreeNode | null = null;
  isLoading = false;
  expandedNodes: Set<string> = new Set();

  constructor(
    private userService: UserService,
    public authService: AuthService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { userId?: string },
    private dialogRef: MatDialogRef<UserHierarchyComponent>
  ) {
    this.userId = data?.userId;
  }

  ngOnInit() {
    const targetUserId = this.userId || this.authService.currentUser?.id;
    if (targetUserId) {
      this.loadHierarchy(targetUserId);
    }
  }

  loadHierarchy(userId: string) {
    this.isLoading = true;
    this.userService.getDownlineTree(userId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.tree = response.data.tree;
          // Expand root node by default
          if (this.tree) {
            this.expandedNodes.add(this.tree.user.id);
          }
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading hierarchy:', error);
        this.snackBar.open(
          error.error?.message || 'Failed to load user hierarchy',
          'Close',
          { duration: 3000 }
        );
      }
    });
  }

  toggleNode(nodeId: string) {
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }
  }

  isExpanded(nodeId: string): boolean {
    return this.expandedNodes.has(nodeId);
  }

  getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      'super_admin': 'Super Admin',
      'admin': 'Admin',
      'moderator': 'Moderator',
      'user': 'User'
    };
    return roleNames[role] || role;
  }

  getRoleColor(role: string): string {
    const roleColors: { [key: string]: string } = {
      'super_admin': 'role-super-admin',
      'admin': 'role-admin',
      'moderator': 'role-moderator',
      'user': 'role-user'
    };
    return roleColors[role] || 'role-user';
  }

  viewUserDetails(userId: string) {
    // Navigate to user details or open dialog
    console.log('View user details:', userId);
  }
}
