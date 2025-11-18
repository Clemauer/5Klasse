import { Component, Input, OnInit } from '@angular/core';
import { Task } from '../../models/task.model';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class TaskComponent  implements OnInit {

  @Input() task!: Task;

  constructor(private router: Router) { }

  ngOnInit() {}

  goToResult() {
    this.router.navigate([this.task.resultLink]);
  }
}
