/**
 * External dependencies
 */
import { getScriptData } from '@automattic/jetpack-script-data';
import { DASHBOARD_REST_NAMESPACE } from '@jetpack-premium-analytics/data';
import apiFetch from '@wordpress/api-fetch';
import { store as bootStore } from '@wordpress/boot';
import { store as coreStore } from '@wordpress/core-data';
import { dispatch, select } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { chartBar } from '@wordpress/icons';

// apiFetch middleware registers onto a shared, process-wide chain. Guard so
// repeated init() calls (re-mount, HMR, a future second boot) don't stack
// duplicate root-URL/nonce middleware.
let authConfigured = false;

/**
 * Configure the bundled apiFetch instance with the WordPress REST API root URL
 * and authentication nonce from Jetpack script data. Runs once before routes
 * render so shared packages (e.g. site-sync) can call the REST API.
 */
function setupApiFetch(): void {
	if ( authConfigured ) {
		return;
	}
	const site = getScriptData()?.site;
	if ( site?.rest_root ) {
		apiFetch.use( apiFetch.createRootURLMiddleware( site.rest_root ) );
	}
	if ( site?.rest_nonce ) {
		apiFetch.use( apiFetch.createNonceMiddleware( site.rest_nonce ) );
	}
	// Only latch once we actually registered, so an early call before
	// script-data is ready doesn't permanently skip configuration.
	if ( site?.rest_root || site?.rest_nonce ) {
		authConfigured = true;
	}
}

/**
 * Register the widget-modules discovery entity so the dashboard stage's
 * `getEntityRecords` read resolves and feeds the records to `useWidgetTypes`.
 * Premium Analytics serves the records from its own namespace (see
 * `src/widget-modules.php`), independent of core's `wp/v2` endpoint.
 */
function registerWidgetModulesEntity(): void {
	if (
		(
			select( coreStore ) as unknown as {
				getEntityConfig: ( kind: string, name: string ) => unknown;
			}
		 ).getEntityConfig( 'root', 'widgetModule' )
	) {
		return;
	}

	const { addEntities } = dispatch( coreStore ) as unknown as {
		addEntities: ( entities: object[] ) => void;
	};
	addEntities( [
		{
			name: 'widgetModule',
			kind: 'root',
			key: 'name',
			baseURL: `/${ DASHBOARD_REST_NAMESPACE }/widget-modules`,
			plural: 'widgetModules',
			label: __( 'Widget modules', 'jetpack-premium-analytics' ),
			supportsPagination: false,
		},
	] );
}

/**
 * Initialize the Jetpack Analytics app.
 * Runs before routes render.
 */
export async function init(): Promise< void > {
	setupApiFetch();

	registerWidgetModulesEntity();

	dispatch( bootStore ).updateMenuItem( 'dashboard', {
		icon: chartBar,
	} );
}
