<?php
/**
 * This configuration will be read and overlaid on top of the
 * default configuration. Command-line arguments will be applied
 * after this file is read.
 *
 * @package automattic/jetpack-premium-analytics
 */

// Require base config.
require __DIR__ . '/../../../../.phan/config.base.php';

return make_phan_config(
	dirname( __DIR__ ),
	array(
		// WooCommerce is a runtime dependency for report exports and Sync integration.
		'+stubs'             => array( 'woocommerce', 'woocommerce-internal' ),
		'exclude_file_regex' => array(
			'build/',
			// Test WooCommerce stubs would redefine the WC symbols above.
			'tests/php/mocks/',
		),
	)
);
