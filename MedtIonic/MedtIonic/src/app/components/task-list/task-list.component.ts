import { Component, OnInit } from '@angular/core';
import { Task } from '../../models/task.model';
import { CommonModule } from '@angular/common';
import { TaskComponent } from '../task/task.component';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  standalone: true,
  imports: [CommonModule, TaskComponent, IonicModule]
})
export class TaskListComponent  implements OnInit {

  tasks: Task[] = [];

  constructor() { }

  ngOnInit() {
    this.tasks = [
      { name: 'Rotating Cube', resultLink: '/tabs/tab1' },
      { name: 'Task List', resultLink: '/tabs/tab2' },
      { name: 'Basic Geometries', resultLink: '/tabs/tab3' },
      { name: 'Height Map', resultLink: '/tabs/tab4' }
    ];
  }

}
