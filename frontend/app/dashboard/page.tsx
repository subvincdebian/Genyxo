import type { Metadata } from 'next';
import { DashboardPage } from '@/pages/dashboard';
import '@/shared/styles/dashboard.css';

import {AdminBoundary} from '@/entities/session';
export const metadata:Metadata={"title":"Admin Dashboard - Genyxo","robots":{"index":false,"follow":false},"alternates":{"canonical":"https://genyxo.com/dashboard.html"}};
export default function Page(){return <><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap"/><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/><AdminBoundary><DashboardPage/></AdminBoundary></>;}