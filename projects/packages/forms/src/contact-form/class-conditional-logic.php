<?php
/**
 * Conditional Logic evaluator for Jetpack form fields.
 *
 * Mirrors the JS implementation in
 * src/blocks/shared/util/conditional-logic.ts and MUST stay in sync.
 *
 * @package automattic/jetpack-forms
 */

namespace Automattic\Jetpack\Forms\ContactForm;

/**
 * Pure evaluator for field conditional-logic rules.
 */
class Conditional_Logic {

	public const OP_IS               = 'is';
	public const OP_IS_NOT           = 'is_not';
	public const OP_CONTAINS         = 'contains';
	public const OP_DOES_NOT_CONTAIN = 'does_not_contain';
	public const OP_IS_EMPTY         = 'is_empty';
	public const OP_IS_NOT_EMPTY     = 'is_not_empty';

	/**
	 * Evaluate a field's conditional logic against the current form values.
	 *
	 * Disabled logic, an empty rules array, or a missing config all resolve to
	 * `true` (field is visible).
	 *
	 * @param array|null $logic       The conditional-logic config attached to the field.
	 * @param array      $form_values Map of field_id => submitted value.
	 *
	 * @return bool True if the field should be visible; false if hidden.
	 */
	public static function evaluate( $logic, array $form_values ): bool {
		if ( ! is_array( $logic ) || empty( $logic['enabled'] ) ) {
			return true;
		}

		$rules = isset( $logic['rules'] ) && is_array( $logic['rules'] ) ? $logic['rules'] : array();
		if ( empty( $rules ) ) {
			return true;
		}

		$logical_operator = isset( $logic['logicalOperator'] ) ? $logic['logicalOperator'] : 'any';
		$action           = isset( $logic['action'] ) ? $logic['action'] : 'show';

		$matched_count = 0;
		foreach ( $rules as $rule ) {
			if ( self::evaluate_rule( $rule, $form_values ) ) {
				++$matched_count;
			}
		}

		if ( 'all' === $logical_operator ) {
			$matched = $matched_count === count( $rules );
		} else {
			$matched = $matched_count > 0;
		}

		return 'hide' === $action ? ! $matched : $matched;
	}

	/**
	 * Evaluate a single rule.
	 *
	 * @param mixed $rule        The rule (expected to be an associative array).
	 * @param array $form_values Map of field_id => submitted value.
	 *
	 * @return bool
	 */
	private static function evaluate_rule( $rule, array $form_values ): bool {
		if ( ! is_array( $rule ) || empty( $rule['field'] ) || empty( $rule['operator'] ) ) {
			return false;
		}

		$field_id = (string) $rule['field'];
		$operator = (string) $rule['operator'];
		$expected = isset( $rule['value'] ) ? (string) $rule['value'] : '';

		$raw_value = array_key_exists( $field_id, $form_values ) ? $form_values[ $field_id ] : '';

		switch ( $operator ) {
			case self::OP_IS:
				return self::to_comparable_string( $raw_value ) === $expected;
			case self::OP_IS_NOT:
				return self::to_comparable_string( $raw_value ) !== $expected;
			case self::OP_CONTAINS:
				return '' !== $expected && false !== strpos( self::to_comparable_string( $raw_value ), $expected );
			case self::OP_DOES_NOT_CONTAIN:
				return '' === $expected || false === strpos( self::to_comparable_string( $raw_value ), $expected );
			case self::OP_IS_EMPTY:
				return self::is_empty_value( $raw_value );
			case self::OP_IS_NOT_EMPTY:
				return ! self::is_empty_value( $raw_value );
			default:
				return false;
		}
	}

	/**
	 * Reduce any submitted value to a comparable string.
	 *
	 * Arrays are joined with commas (mirrors the JS side for multi-value inputs).
	 * Objects/other complex types collapse to empty string.
	 *
	 * @param mixed $value The submitted value.
	 *
	 * @return string
	 */
	private static function to_comparable_string( $value ): string {
		if ( null === $value ) {
			return '';
		}
		if ( is_array( $value ) ) {
			$parts = array();
			foreach ( $value as $item ) {
				$parts[] = self::to_comparable_string( $item );
			}
			return implode( ',', $parts );
		}
		if ( is_object( $value ) ) {
			return '';
		}
		if ( is_bool( $value ) ) {
			return $value ? '1' : '';
		}
		return (string) $value;
	}

	/**
	 * Mirror of `isEmptyValue` from src/contact-form/js/validate-helper.js.
	 *
	 * @param mixed $value The submitted value.
	 *
	 * @return bool
	 */
	private static function is_empty_value( $value ): bool {
		if ( null === $value ) {
			return true;
		}
		if ( is_string( $value ) ) {
			return '' === trim( $value );
		}
		if ( is_array( $value ) ) {
			if ( empty( $value ) ) {
				return true;
			}
			foreach ( $value as $item ) {
				if ( ! self::is_empty_value( $item ) ) {
					return false;
				}
			}
			return true;
		}
		if ( is_object( $value ) ) {
			$vars = get_object_vars( $value );
			if ( empty( $vars ) ) {
				return true;
			}
			foreach ( $vars as $item ) {
				if ( ! self::is_empty_value( $item ) ) {
					return false;
				}
			}
			return true;
		}
		return false;
	}
}
