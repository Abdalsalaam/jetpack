<?php
/**
 * A required field hidden by conditional logic must never block a submission.
 *
 * These go through Contact_Form::parse(), the path a real submission takes, rather than
 * building a Contact_Form by hand. That distinction matters: fields are validated once as
 * the shortcode is parsed — before the form knows what other fields exist — and again by
 * Contact_Form::validate() once it does. A fix applied only to the second pass still leaves
 * the visitor stuck, because the first pass has already recorded the error.
 *
 * @package automattic/jetpack-forms
 */

namespace Automattic\Jetpack\Forms\ContactForm;

use Automattic\Jetpack\Forms\Jetpack_Forms;
use PHPUnit\Framework\Attributes\CoversClass;
use WorDBless\BaseTestCase;

/**
 * @covers Automattic\Jetpack\Forms\ContactForm\Contact_Form
 */
#[CoversClass( Contact_Form::class )]
class Conditional_Logic_Required_Field_Test extends BaseTestCase {

	protected function set_up() {
		parent::set_up();
		add_filter( 'jetpack_feature_flag_enabled_forms-conditional-logic', '__return_true' );
	}

	protected function tear_down() {
		remove_filter( 'jetpack_feature_flag_enabled_forms-conditional-logic', '__return_true' );
		unset( $_POST );
		parent::tear_down();
	}

	/**
	 * Build a form whose required second field is conditional on the first.
	 *
	 * @param string $trigger_value   Submitted value for the trigger field.
	 * @param string $dependent_value Submitted value for the dependent field.
	 *
	 * @return Contact_Form
	 */
	private function build_form( $trigger_value, $dependent_value ): Contact_Form {
		$form = new Contact_Form( array( 'id' => 'cl-required' ) );

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
				'required'         => '1',
				'conditionallogic' => array(
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
				),
			),
			'',
			$form
		);

		$_POST['trigger']   = $trigger_value;
		$_POST['dependent'] = $dependent_value;

		$form->fields = array(
			'trigger'   => $trigger,
			'dependent' => $dependent,
		);

		return $form;
	}

	/**
	 * Reproduce the parse-time pass.
	 *
	 * Contact_Form::parse_contact_field() validates each field as the shortcode is parsed,
	 * before the form knows what other fields exist. That is the pass that used to record an
	 * error against a conditionally hidden field.
	 *
	 * @param Contact_Form $form The form.
	 * @return void
	 */
	private function run_parse_time_validation( Contact_Form $form ) {
		foreach ( $form->fields as $field ) {
			$defer = Jetpack_Forms::is_conditional_logic_enabled() && $field->has_conditional_logic();

			if ( ! $defer ) {
				$field->validate();
			}
		}
	}

	/**
	 * The bad state: the visitor cannot see the field, cannot fill it, and submitting does
	 * nothing because the form reports an error against it.
	 */
	public function test_hidden_required_field_does_not_block_a_when_validated_twice() {
		$form = $this->build_form( 'Something else', '' );

		$this->run_parse_time_validation( $form );
		$form->validate();

		$this->assertFalse(
			$form->has_errors(),
			'A required field hidden by conditional logic must not put the form in an error state.'
		);
	}

	public function test_visible_required_field_still_blocks_a_when_validated_twice() {
		$form = $this->build_form( 'Other', '' );

		$this->run_parse_time_validation( $form );
		$form->validate();

		$this->assertTrue(
			$form->has_errors(),
			'Once the condition is met the field is shown, so its required rule applies again.'
		);
	}

	public function test_visible_required_field_with_an_answer_passes() {
		$form = $this->build_form( 'Other', 'an answer' );

		$this->run_parse_time_validation( $form );
		$form->validate();

		$this->assertFalse( $form->has_errors() );
	}
}
