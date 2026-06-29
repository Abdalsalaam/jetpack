/**
 * Constants for API endpoints
 */
export const statsProxyPath = '/jetpack-premium-analytics/v1/proxy';
export const reportsPath = `${ statsProxyPath }/v2/analytics/reports`;

/**
 * REST namespace that exposes Premium Analytics' dashboard data, including the
 * dashboard default-layout and the widget-modules discovery endpoint. Single
 * source of truth for the namespace, shared by the dashboard route hooks and
 * the app-boot widget-modules entity registration in the init module.
 */
export const DASHBOARD_REST_NAMESPACE = 'jetpack/v4';
