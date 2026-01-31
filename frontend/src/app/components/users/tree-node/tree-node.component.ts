import { Component, Input, Output, EventEmitter } from '@angular/core';

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
  selector: 'app-tree-node',
  templateUrl: './tree-node.component.html',
  styleUrls: ['./tree-node.component.scss']
})
export class TreeNodeComponent {
  @Input() node!: TreeNode;
  @Input() level: number = 0;
  @Input() expandedNodes: Set<string> = new Set();
  @Output() toggleNode = new EventEmitter<string>();
  @Output() viewUser = new EventEmitter<string>();

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

  onToggleNode(nodeId: string) {
    this.toggleNode.emit(nodeId);
  }

  onViewUser(userId: string) {
    this.viewUser.emit(userId);
  }
}
