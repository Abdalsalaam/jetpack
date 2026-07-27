<?php
/**
 * Tests for the Instant Search / Customberg initial state payload.
 *
 * @package automattic/jetpack-search
 */

namespace Automattic\Jetpack\Search;

use Automattic\Jetpack\Search\TestCase as Search_TestCase;

/**
 * Unit tests for Helper::generate_initial_javascript_state().
 */
class Initial_Javascript_State_Test extends Search_TestCase {
	use Toggles_Ai_Master;

	public function tearDown(): void {
		$this->remove_ai_master_filters();
		parent::tearDown();
	}

	public function test_it_reports_the_ai_master_switch_as_off() {
		$this->turn_ai_master_off();

		$state = Helper::generate_initial_javascript_state();

		$this->assertFalse( $state['aiMasterEnabled'] );
	}

	public function test_it_reports_the_ai_master_switch_as_on() {
		$this->turn_ai_master_on();

		$state = Helper::generate_initial_javascript_state();

		$this->assertTrue( $state['aiMasterEnabled'] );
	}
}
