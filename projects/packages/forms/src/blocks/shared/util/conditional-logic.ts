import { isEmptyValue } from '../../../contact-form/js/validate-helper.js';

export const OPERATORS = {
	IS: 'is',
	IS_NOT: 'is_not',
	CONTAINS: 'contains',
	DOES_NOT_CONTAIN: 'does_not_contain',
	IS_EMPTY: 'is_empty',
	IS_NOT_EMPTY: 'is_not_empty',
} as const;

export type Operator = ( typeof OPERATORS )[ keyof typeof OPERATORS ];

export type Rule = {
	field: string;
	operator: Operator | string;
	value?: string;
};

export type ConditionalLogic = {
	enabled: boolean;
	action: 'show' | 'hide';
	logicalOperator: 'any' | 'all';
	rules: Rule[];
};

export type EvaluationResult = {
	visible: boolean;
};

export type FormValues = Record< string, unknown >;

const toComparableString = ( value: unknown ): string => {
	if ( value === null || value === undefined ) {
		return '';
	}
	if ( Array.isArray( value ) ) {
		return value.map( toComparableString ).join( ',' );
	}
	if ( typeof value === 'object' ) {
		return '';
	}
	return String( value );
};

const evaluateRule = ( rule: Rule, formValues: FormValues ): boolean => {
	const rawValue = Object.prototype.hasOwnProperty.call( formValues, rule.field )
		? formValues[ rule.field ]
		: '';
	const expected = rule.value ?? '';

	switch ( rule.operator ) {
		case OPERATORS.IS:
			return toComparableString( rawValue ) === expected;
		case OPERATORS.IS_NOT:
			return toComparableString( rawValue ) !== expected;
		case OPERATORS.CONTAINS:
			return toComparableString( rawValue ).includes( expected );
		case OPERATORS.DOES_NOT_CONTAIN:
			return ! toComparableString( rawValue ).includes( expected );
		case OPERATORS.IS_EMPTY:
			return isEmptyValue( rawValue );
		case OPERATORS.IS_NOT_EMPTY:
			return ! isEmptyValue( rawValue );
		default:
			return false;
	}
};

/**
 * Evaluate a field's conditional logic against the current form values.
 *
 * Disabled logic, empty rules, or a missing config all resolve to visible.
 *
 * @param logic      - The conditional-logic config attached to the field (or null).
 * @param formValues - Map of field id to submitted value.
 * @return Evaluation result describing whether the field should render.
 */
export const evaluateConditionalLogic = (
	logic: ConditionalLogic | null | undefined,
	formValues: FormValues
): EvaluationResult => {
	if ( ! logic || ! logic.enabled ) {
		return { visible: true };
	}

	const rules = Array.isArray( logic.rules ) ? logic.rules : [];
	if ( rules.length === 0 ) {
		return { visible: true };
	}

	const results = rules.map( rule => evaluateRule( rule, formValues ) );
	const matched =
		logic.logicalOperator === 'all' ? results.every( Boolean ) : results.some( Boolean );

	const visible = logic.action === 'hide' ? ! matched : matched;
	return { visible };
};
