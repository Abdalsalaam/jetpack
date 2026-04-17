<?php
/**
 * Unit tests for Automattic\Jetpack\Forms\ContactForm\Conditional_Logic.
 *
 * @package automattic/jetpack-forms
 */

namespace Automattic\Jetpack\Forms\ContactForm;

use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;

/**
 * @covers Automattic\Jetpack\Forms\ContactForm\Conditional_Logic
 */
#[CoversClass( Conditional_Logic::class )]
class Conditional_Logic_Test extends TestCase {

	/**
	 * Build a base logic config merged with overrides.
	 *
	 * @param array $overrides Values to merge on top of defaults.
	 *
	 * @return array
	 */
	private function logic( array $overrides = array() ): array {
		return array_merge(
			array(
				'enabled'         => true,
				'action'          => 'show',
				'logicalOperator' => 'any',
				'rules'           => array(),
			),
			$overrides
		);
	}

	public function test_null_logic_is_visible() {
		$this->assertTrue( Conditional_Logic::evaluate( null, array() ) );
	}

	public function test_disabled_logic_is_visible_even_with_rules() {
		$logic = $this->logic(
			array(
				'enabled' => false,
				'rules'   => array(
					array(
						'field'    => 'a',
						'operator' => 'is',
						'value'    => 'x',
					),
				),
			)
		);
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => 'not-x' ) ) );
	}

	public function test_empty_rules_is_visible() {
		$this->assertTrue( Conditional_Logic::evaluate( $this->logic(), array() ) );
	}

	public function test_operator_is() {
		$logic = $this->logic(
			array(
				'rules' => array(
					array(
						'field'    => 'a',
						'operator' => 'is',
						'value'    => 'x',
					),
				),
			)
		);
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => 'x' ) ) );
		$this->assertFalse( Conditional_Logic::evaluate( $logic, array( 'a' => 'y' ) ) );
	}

	public function test_operator_is_not() {
		$logic = $this->logic(
			array(
				'rules' => array(
					array(
						'field'    => 'a',
						'operator' => 'is_not',
						'value'    => 'x',
					),
				),
			)
		);
		$this->assertFalse( Conditional_Logic::evaluate( $logic, array( 'a' => 'x' ) ) );
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => 'y' ) ) );
	}

	public function test_operator_contains() {
		$logic = $this->logic(
			array(
				'rules' => array(
					array(
						'field'    => 'a',
						'operator' => 'contains',
						'value'    => 'foo',
					),
				),
			)
		);
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => 'foobar' ) ) );
		$this->assertFalse( Conditional_Logic::evaluate( $logic, array( 'a' => 'baz' ) ) );
	}

	public function test_operator_does_not_contain() {
		$logic = $this->logic(
			array(
				'rules' => array(
					array(
						'field'    => 'a',
						'operator' => 'does_not_contain',
						'value'    => 'foo',
					),
				),
			)
		);
		$this->assertFalse( Conditional_Logic::evaluate( $logic, array( 'a' => 'foobar' ) ) );
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => 'baz' ) ) );
	}

	public function test_operator_is_empty() {
		$logic = $this->logic(
			array(
				'rules' => array(
					array(
						'field'    => 'a',
						'operator' => 'is_empty',
					),
				),
			)
		);
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => '' ) ) );
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => '   ' ) ) );
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => null ) ) );
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array() ) );
		$this->assertFalse( Conditional_Logic::evaluate( $logic, array( 'a' => 'hi' ) ) );
	}

	public function test_operator_is_not_empty() {
		$logic = $this->logic(
			array(
				'rules' => array(
					array(
						'field'    => 'a',
						'operator' => 'is_not_empty',
					),
				),
			)
		);
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => 'hi' ) ) );
		$this->assertFalse( Conditional_Logic::evaluate( $logic, array( 'a' => '' ) ) );
		$this->assertFalse( Conditional_Logic::evaluate( $logic, array() ) );
	}

	public function test_unknown_operator_does_not_match() {
		$logic = $this->logic(
			array(
				'rules' => array(
					array(
						'field'    => 'a',
						'operator' => 'bogus',
						'value'    => 'x',
					),
				),
			)
		);
		$this->assertFalse( Conditional_Logic::evaluate( $logic, array( 'a' => 'x' ) ) );
	}

	public function test_logical_any_matches_when_any_rule_matches() {
		$logic = $this->logic(
			array(
				'logicalOperator' => 'any',
				'rules'           => array(
					array(
						'field'    => 'a',
						'operator' => 'is',
						'value'    => 'x',
					),
					array(
						'field'    => 'b',
						'operator' => 'is',
						'value'    => 'y',
					),
				),
			)
		);
		$this->assertTrue(
			Conditional_Logic::evaluate(
				$logic,
				array(
					'a' => 'x',
					'b' => 'no',
				)
			)
		);
		$this->assertTrue(
			Conditional_Logic::evaluate(
				$logic,
				array(
					'a' => 'no',
					'b' => 'y',
				)
			)
		);
		$this->assertFalse(
			Conditional_Logic::evaluate(
				$logic,
				array(
					'a' => 'no',
					'b' => 'no',
				)
			)
		);
	}

	public function test_logical_all_requires_every_rule_to_match() {
		$logic = $this->logic(
			array(
				'logicalOperator' => 'all',
				'rules'           => array(
					array(
						'field'    => 'a',
						'operator' => 'is',
						'value'    => 'x',
					),
					array(
						'field'    => 'b',
						'operator' => 'is',
						'value'    => 'y',
					),
				),
			)
		);
		$this->assertTrue(
			Conditional_Logic::evaluate(
				$logic,
				array(
					'a' => 'x',
					'b' => 'y',
				)
			)
		);
		$this->assertFalse(
			Conditional_Logic::evaluate(
				$logic,
				array(
					'a' => 'x',
					'b' => 'no',
				)
			)
		);
		$this->assertFalse(
			Conditional_Logic::evaluate(
				$logic,
				array(
					'a' => 'no',
					'b' => 'y',
				)
			)
		);
	}

	public function test_action_hide_inverts_the_match() {
		$rules = array(
			array(
				'field'    => 'a',
				'operator' => 'is',
				'value'    => 'x',
			),
		);

		$show = $this->logic(
			array(
				'action' => 'show',
				'rules'  => $rules,
			)
		);
		$this->assertTrue( Conditional_Logic::evaluate( $show, array( 'a' => 'x' ) ) );
		$this->assertFalse( Conditional_Logic::evaluate( $show, array( 'a' => 'y' ) ) );

		$hide = $this->logic(
			array(
				'action' => 'hide',
				'rules'  => $rules,
			)
		);
		$this->assertFalse( Conditional_Logic::evaluate( $hide, array( 'a' => 'x' ) ) );
		$this->assertTrue( Conditional_Logic::evaluate( $hide, array( 'a' => 'y' ) ) );
	}

	public function test_unknown_source_field_treated_as_empty() {
		$logic = $this->logic(
			array(
				'rules' => array(
					array(
						'field'    => 'missing',
						'operator' => 'is_empty',
					),
				),
			)
		);
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => 'x' ) ) );
	}

	public function test_array_values_join_as_comma_separated_for_contains() {
		$logic = $this->logic(
			array(
				'rules' => array(
					array(
						'field'    => 'a',
						'operator' => 'contains',
						'value'    => 'bar',
					),
				),
			)
		);
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => array( 'foo', 'bar' ) ) ) );
	}

	public function test_missing_rules_key_is_visible() {
		$logic = array(
			'enabled'         => true,
			'action'          => 'show',
			'logicalOperator' => 'any',
		);
		$this->assertTrue( Conditional_Logic::evaluate( $logic, array( 'a' => 'x' ) ) );
	}
}
