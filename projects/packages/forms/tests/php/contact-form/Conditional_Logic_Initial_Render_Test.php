<?php
/**
 * Conditionally hidden fields must be hidden in the markup the server sends.
 *
 * Otherwise every field arrives visible and the browser hides them once the interactivity
 * store hydrates, so the visitor watches the hidden fields flash on screen and the form
 * reflow. The initial paint has to already agree with what the client will compute.
 *
 * @package automattic/jetpack-forms
 */

namespace Automattic\Jetpack\Forms\ContactForm;

use PHPUnit\Framework\Attributes\CoversClass;
use WorDBless\BaseTestCase;

/**
 * @covers Automattic\Jetpack\Forms\ContactForm\Contact_Form
 */
#[CoversClass( Contact_Form::class )]
class Conditional_Logic_Initial_Render_Test extends BaseTestCase {

	protected function set_up() {
		parent::set_up();
		add_filter( 'jetpack_feature_flag_enabled_forms-conditional-logic', '__return_true' );
	}

	protected function tear_down() {
		remove_filter( 'jetpack_feature_flag_enabled_forms-conditional-logic', '__return_true' );
		unset( $_GET, $_POST );
		parent::tear_down();
	}

	/**
	 * Conditional logic showing the dependent field when trigger is "Other".
	 *
	 * @return array
	 */
	private function logic(): array {
		return array(
			'enabled'         => true,
			'action'          => 'show',
			'logicalOperator' => 'all',
			'controls'        => array(
				'fieldValue' => array(
					'rules' => array(
						array(
							'field'    => 'trigger',
							'operator' => 'is',
							'value'    => 'Other',
						),
					),
				),
			),
		);
	}

	/**
	 * Build a two-field form and return the rendered body.
	 *
	 * @return string
	 */
	private function render_body(): string {
		$form = new Contact_Form( array( 'id' => 'cl-render' ) );

		$trigger = new Contact_Form_Field(
			array(
				'id'    => 'trigger',
				'type'  => 'text',
				'label' => 'Trigger',
			),
			'',
			$form
		);

		$dependent = new Contact_Form_Field(
			array(
				'id'               => 'dependent',
				'type'             => 'text',
				'label'            => 'Dependent',
				'conditionallogic' => $this->logic(),
			),
			'',
			$form
		);

		$form->fields = array(
			'trigger'   => $trigger,
			'dependent' => $dependent,
		);

		$form->body = $trigger->render() . $dependent->render();

		$reflection = new \ReflectionMethod( $form, 'apply_initial_field_visibility' );
		$reflection->setAccessible( true );
		$reflection->invoke( $form );

		return (string) $form->body;
	}

	/**
	 * Extract the wrapper markup for one field.
	 *
	 * @param string $body     Rendered form body.
	 * @param string $field_id Field id.
	 * @return string
	 */
	private function wrapper_for( string $body, string $field_id ): string {
		$processor = new \WP_HTML_Tag_Processor( $body );

		while ( $processor->next_tag( array( 'tag_name' => 'DIV' ) ) ) {
			if ( $field_id === $processor->get_attribute( 'data-jp-field-id' ) ) {
				return (string) $processor->get_attribute( 'class' );
			}
		}

		return '';
	}

	public function test_a_hidden_field_ships_hidden() {
		$body = $this->render_body();

		$this->assertStringContainsString(
			'jetpack-field--conditionally-hidden',
			$this->wrapper_for( $body, 'dependent' ),
			'A field whose condition is unmet must arrive hidden, not flash into view.'
		);
	}

	public function test_an_unconditional_field_is_untouched() {
		$body = $this->render_body();

		$this->assertStringNotContainsString(
			'jetpack-field--conditionally-hidden',
			$this->wrapper_for( $body, 'trigger' ),
			'A field with no conditions must never be marked hidden.'
		);
	}

	/**
	 * Fields can be prefilled from the query string, e.g. `?trigger=Other`. The initial
	 * visibility has to take that into account: resolving against an empty form would hide a
	 * field the visitor can already see is satisfied, producing the opposite flash.
	 */
	public function test_a_query_parameter_prefill_can_reveal_the_field() {
		$_GET['trigger'] = 'Other';

		$body = $this->render_body();

		$this->assertStringNotContainsString(
			'jetpack-field--conditionally-hidden',
			$this->wrapper_for( $body, 'dependent' ),
			'A query-parameter prefill satisfying the rule must render the field visible.'
		);
	}

	public function test_a_query_parameter_that_does_not_match_keeps_it_hidden() {
		$_GET['trigger'] = 'Something else';

		$body = $this->render_body();

		$this->assertStringContainsString(
			'jetpack-field--conditionally-hidden',
			$this->wrapper_for( $body, 'dependent' )
		);
	}

	public function test_a_submitted_value_takes_precedence_over_the_query_string() {
		$_GET['trigger']  = 'Other';
		$_POST['trigger'] = 'Something else';

		$body = $this->render_body();

		$this->assertStringContainsString(
			'jetpack-field--conditionally-hidden',
			$this->wrapper_for( $body, 'dependent' ),
			'A re-rendered submission resolves against what was submitted, not the query string.'
		);
	}

	/**
	 * The transition is scoped to [data-jp-conditional] so only fields that actually carry a
	 * condition animate; everything else renders with no animation cost at all.
	 */
	public function test_only_conditional_fields_carry_the_animation_marker() {
		$body = $this->render_body();

		$processor = new \WP_HTML_Tag_Processor( $body );
		$marked    = array();

		while ( $processor->next_tag( array( 'tag_name' => 'DIV' ) ) ) {
			$field_id = $processor->get_attribute( 'data-jp-field-id' );

			if ( null !== $field_id && null !== $processor->get_attribute( 'data-jp-conditional' ) ) {
				$marked[] = $field_id;
			}
		}

		$this->assertSame( array( 'dependent' ), $marked );
	}

	public function test_nothing_is_marked_when_the_feature_is_off() {
		remove_filter( 'jetpack_feature_flag_enabled_forms-conditional-logic', '__return_true' );

		$body = $this->render_body();

		$this->assertStringNotContainsString(
			'jetpack-field--conditionally-hidden',
			$this->wrapper_for( $body, 'dependent' )
		);
	}
}
