import { AdminLayout } from '@/components/admin/AdminLayout'
import { AuthGuard } from '@/components/admin/AuthGuard'
import type { Component } from 'solid-js'
import { AccountPage } from './admin/AccountPage'
import { EventLogsPage } from './admin/EventLogsPage'
import { EventsPage } from './admin/EventsPage'
import { ManualResultsPage } from './admin/ManualResultsPage'
import { ParkrunsPage } from './admin/ParkrunsPage'
import { RunnersPage } from './admin/RunnersPage'
import { ScanPage } from './admin/ScanPage'
import { UsersPage } from './admin/UsersPage'

export const AdminPage: Component = () => {
	return (
		<AuthGuard>
			<AdminLayout>
				<EventsPage />
			</AdminLayout>
		</AuthGuard>
	)
}

export const AdminScanPage: Component = () => {
	return (
		<AuthGuard>
			<AdminLayout fullPage>
				<ScanPage />
			</AdminLayout>
		</AuthGuard>
	)
}

export const AdminUsersPage: Component = () => {
	return (
		<AuthGuard>
			<AdminLayout>
				<UsersPage />
			</AdminLayout>
		</AuthGuard>
	)
}

export const AdminAccountPage: Component = () => {
	return (
		<AuthGuard>
			<AdminLayout>
				<AccountPage />
			</AdminLayout>
		</AuthGuard>
	)
}

export const AdminLogsPage: Component = () => {
	return (
		<AuthGuard>
			<AdminLayout>
				<EventLogsPage />
			</AdminLayout>
		</AuthGuard>
	)
}

export const AdminRunnersPage: Component = () => {
	return (
		<AuthGuard>
			<AdminLayout>
				<RunnersPage />
			</AdminLayout>
		</AuthGuard>
	)
}

export const AdminParkrunsPage: Component = () => {
	return (
		<AuthGuard>
			<AdminLayout>
				<ParkrunsPage />
			</AdminLayout>
		</AuthGuard>
	)
}

export const AdminManualResultsPage: Component = () => {
	return (
		<AuthGuard>
			<AdminLayout>
				<ManualResultsPage />
			</AdminLayout>
		</AuthGuard>
	)
}
