<?php
/**
 * Helpers for flipping the site-wide Jetpack AI master switch in tests.
 *
 * @package automattic/jetpack-search
 */

namespace Automattic\Jetpack\Search;

/**
 * Off WordPress.com Simple the master switch is the `ai` Jetpack module, which
 * the Jetpack plugin owns. These helpers stand in for it: they register `ai` as
 * an available module and control whether it is active.
 *
 * Call remove_ai_master_filters() from tearDown().
 */
trait Toggles_Ai_Master {

	/**
	 * Register `ai` as an available module, the way the Jetpack plugin does.
	 *
	 * @param array $modules Available module slugs.
	 * @return array
	 */
	public function add_ai_module( $modules ) {
		$modules[] = AI_Answers::AI_MODULE;
		return $modules;
	}

	/**
	 * Report `ai` among the active modules.
	 *
	 * @param mixed  $value Option value.
	 * @param string $name  Option name.
	 * @return mixed
	 */
	public function activate_ai_module( $value, $name ) {
		if ( 'active_modules' !== $name ) {
			return $value;
		}
		return array( AI_Answers::AI_MODULE );
	}

	/**
	 * Make the `ai` module available, so the master switch has somewhere to live.
	 */
	protected function register_ai_module() {
		add_filter( 'jetpack_get_available_standalone_modules', array( $this, 'add_ai_module' ) );
	}

	/**
	 * Site has a master switch and it is on.
	 */
	protected function turn_ai_master_on() {
		$this->register_ai_module();
		add_filter( 'jetpack_options', array( $this, 'activate_ai_module' ), 10, 2 );
	}

	/**
	 * Site has a master switch and it is off.
	 */
	protected function turn_ai_master_off() {
		$this->register_ai_module();
	}

	/**
	 * Drop everything the helpers added.
	 */
	protected function remove_ai_master_filters() {
		remove_filter( 'jetpack_get_available_standalone_modules', array( $this, 'add_ai_module' ) );
		remove_filter( 'jetpack_options', array( $this, 'activate_ai_module' ) );
	}
}
