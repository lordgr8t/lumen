import { Routes } from '@angular/router';
import { Home } from '@layout/home/home';
import { Auth } from '@layout/auth/auth';

export const routes: Routes = [
    {
        path: '',
        component: Home
    },
    {
        path: 'auth',
        component: Auth
    }
];
