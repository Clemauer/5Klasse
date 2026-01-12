import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        loadComponent: () =>
          import('../components/rotationg-cube/rotationg-cube.component').then((m) => m.RotationgCubeComponent),
      },
      {
        path: 'tab2',
        loadComponent: () =>
          import('../components/task-list/task-list.component').then((m) => m.TaskListComponent),
      },
      {
        path: 'tab3',
        loadComponent: () =>
          import('../components/basic-geometries/basic-geometries.component').then((m) => m.BasicGeometriesComponent),
      },
      {
        path: 'tab4',
        loadComponent: () =>
          import('../components/hight-map/hight-map.component').then((m) => m.HightMapComponent),
      },
      {
        path: '',
        redirectTo: '/tabs/tab1',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/tab1',
    pathMatch: 'full',
  },
];
