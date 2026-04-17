<?php
/**
 * Integration tests for conditional-logic enforcement during feedback creation.
 *
 * @package automattic/jetpack-forms
 */

namespace Automattic\Jetpack\Forms\ContactForm;

use PHPUnit\Framework\Attributes\CoversClass;
use WorDBless\BaseTestCase;

/**
 * @covers Automattic\Jetpack\Forms\ContactForm\Feedback
 */
#[CoversClass( Feedback::class )]
class Feedback_Conditional_Logic_Test extends BaseTestCase {

	protected function tear_down() {
		parent::tear_down();
		unset( $_POST );
	}

	/**
	 * Build a Contact_Form with a trigger text field and a dependent text field
	 * whose visibility depends on the trigger.
	 *
	 * @param array $dependent_logic Conditional logic config attached to the dependent field.
	 *
	 * @return Contact_Form
	 */
	private function build_form_with_dependent_field( array $dependent_logic ): Contact_Form {
		$form = new Contact_Form( array( 'id' => 'cf-test' ) );

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
				'conditionallogic' => $dependent_logic,
			),
			'',
			$form
		);

		$form->fields = array(
			'trigger'   => $trigger,
			'dependent' => $dependent,
		);

		return $form;
	}

	/**
	 * Extract the feedback-field keys that reference a given original field id.
	 *
	 * @param Feedback $feedback     The feedback instance.
	 * @param string   $original_id  The field id set on the original Contact_Form_Field.
	 *
	 * @return Feedback_Field|null
	 */
	private function find_feedback_field( Feedback $feedback, string $original_id ) {
		return $feedback->get_field_by_form_field_id( $original_id );
	}

	public function test_hidden_dependent_field_is_not_persisted() {
		$form = $this->build_form_with_dependent_field(
			array(
				'enabled'         => true,
				'action'          => 'show',
				'logicalOperator' => 'any',
				'rules'           => array(
					array(
						'field'    => 'trigger',
						'operator' => 'is',
						'value'    => 'yes',
					),
				),
			)
		);

		$post_data = array(
			'trigger'   => 'no',
			'dependent' => 'should-not-be-stored',
		);

		$feedback = Feedback::from_submission( $post_data, $form );

		$this->assertNotNull(
			$this->find_feedback_field( $feedback, 'trigger' ),
			'Trigger field should always be present.'
		);
		$this->assertNull(
			$this->find_feedback_field( $feedback, 'dependent' ),
			'Dependent field should be stripped when conditional logic says it is hidden.'
		);
	}

	public function test_visible_dependent_field_is_persisted() {
		$form = $this->build_form_with_dependent_field(
			array(
				'enabled'         => true,
				'action'          => 'show',
				'logicalOperator' => 'any',
				'rules'           => array(
					array(
						'field'    => 'trigger',
						'operator' => 'is',
						'value'    => 'yes',
					),
				),
			)
		);

		$post_data = array(
			'trigger'   => 'yes',
			'dependent' => 'kept',
		);

		$feedback = Feedback::from_submission( $post_data, $form );

		$dependent_field = $this->find_feedback_field( $feedback, 'dependent' );
		$this->assertNotNull( $dependent_field, 'Dependent field should persist when rule matches.' );
		$this->assertSame( 'kept', $dependent_field->get_value() );
	}

	public function test_disabled_logic_never_strips_fields() {
		$form = $this->build_form_with_dependent_field(
			array(
				'enabled'         => false,
				'action'          => 'show',
				'logicalOperator' => 'any',
				'rules'           => array(
					array(
						'field'    => 'trigger',
						'operator' => 'is',
						'value'    => 'yes',
					),
				),
			)
		);

		$post_data = array(
			'trigger'   => 'no',
			'dependent' => 'still-kept',
		);

		$feedback = Feedback::from_submission( $post_data, $form );

		$dependent_field = $this->find_feedback_field( $feedback, 'dependent' );
		$this->assertNotNull( $dependent_field, 'Disabled logic must not strip the field.' );
		$this->assertSame( 'still-kept', $dependent_field->get_value() );
	}

	public function test_hide_action_strips_when_rule_matches() {
		$form = $this->build_form_with_dependent_field(
			array(
				'enabled'         => true,
				'action'          => 'hide',
				'logicalOperator' => 'any',
				'rules'           => array(
					array(
						'field'    => 'trigger',
						'operator' => 'is',
						'value'    => 'secret',
					),
				),
			)
		);

		$post_data = array(
			'trigger'   => 'secret',
			'dependent' => 'leak',
		);

		$feedback = Feedback::from_submission( $post_data, $form );

		$this->assertNull(
			$this->find_feedback_field( $feedback, 'dependent' ),
			'Hide-action should strip the value when its rule matches.'
		);
	}
}
