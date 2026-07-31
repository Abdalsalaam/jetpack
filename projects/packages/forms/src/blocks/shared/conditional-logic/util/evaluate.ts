/*
 * Conditional-logic evaluation for Jetpack form fields.
 *
 * Mirrors the PHP implementation in src/contact-form/class-conditional-logic.php and MUST
 * stay in sync with it: the browser decides what to show, PHP decides what to validate and
 * store, and a disagreement between them either drops a real answer or leaks a hidden one.
 * Conditional_Logic_Parity_Test guards the operator vocabulary.
 */

import { OPERATORS, getTypeKeyForFieldType, operatorNeedsValue } from './field-types';
import type { Operator, TypeKey } from './field-types';

/**
 * Upper bound on cascade passes. A form would need a dependency chain this deep to need
 * them all; the cap exists so circular rules terminate instead of spinning.
 */
export const MAX_CASCADE_PASSES = 25;

export type Rule = {
	field: string;
	operator: Operator | string;
	value?: unknown;
};

export type ConditionalLogic = {
	enabled?: boolean;
	action?: 'show' | 'hide';
	logicalOperator?: 'any' | 'all';
	controls?: {
		fieldValue?: { rules?: Rule[] };
	};
};

export type FormValues = Record< string, unknown >;

export type FieldDescriptor = {
	logic: ConditionalLogic | null;
	/**
	 * The field's shortcode `type`, e.g. `checkbox-multiple` — not a TypeKey.
	 *
	 * Deliberately the same vocabulary the PHP evaluator takes, so the two mirrors accept
	 * identical inputs and a fix can be ported between them without translating arguments.
	 */
	type: string;
};

/**
 * Reduce a submitted value to a comparable string, for the type keys that compare textually.
 *
 * @param value - The submitted value.
 * @return Comparable string; empty for values with no sensible text form.
 */
const toComparableString = ( value: unknown ): string => {
	if ( value === null || value === undefined ) {
		return '';
	}
	if ( typeof value === 'boolean' ) {
		return value ? '1' : '';
	}
	if ( Array.isArray( value ) ) {
		return value.map( toComparableString ).join( ',' );
	}
	if ( typeof value === 'object' ) {
		return '';
	}
	return String( value );
};

/**
 * Whether a submitted value counts as unanswered.
 *
 * @param value - The submitted value.
 * @return True when the field has no answer.
 */
const isEmptyValue = ( value: unknown ): boolean => {
	if ( value === null || value === undefined ) {
		return true;
	}
	if ( typeof value === 'string' ) {
		return '' === value.trim();
	}
	if ( typeof value === 'boolean' ) {
		return ! value;
	}
	if ( Array.isArray( value ) ) {
		return value.every( isEmptyValue );
	}
	if ( typeof value === 'object' ) {
		return Object.values( value as Record< string, unknown > ).every( isEmptyValue );
	}
	return false;
};

/**
 * Normalize a multi-select value into a list of selected option strings.
 *
 * Membership comparison exists so `contains "Blue"` does not match an option named
 * "Blueberry", and so an option containing a comma cannot corrupt the comparison.
 *
 * @param value - The submitted value.
 * @return Selected options, trimmed, with blanks removed.
 */
const toSelectionList = ( value: unknown ): string[] => {
	const raw = Array.isArray( value ) ? value : [ value ];
	const list: string[] = [];
	raw.forEach( item => {
		const text = toComparableString( item ).trim();
		if ( '' !== text ) {
			list.push( text );
		}
	} );
	return list;
};

/**
 * Parse both sides of a numeric comparison.
 *
 * @param actual   - The submitted value.
 * @param expected - The value configured on the rule.
 * @return Both sides as numbers, or null when either side is not numeric.
 */
const toNumericPair = ( actual: unknown, expected: unknown ): [ number, number ] | null => {
	const left = toComparableString( actual ).trim();
	const right = toComparableString( expected ).trim();
	if ( '' === left || '' === right ) {
		return null;
	}
	const leftNumber = Number( left );
	const rightNumber = Number( right );
	if ( ! Number.isFinite( leftNumber ) || ! Number.isFinite( rightNumber ) ) {
		return null;
	}
	return [ leftNumber, rightNumber ];
};

/**
 * Parse both sides of a date or time comparison into comparable numbers.
 *
 * Times are compared as minutes since midnight so a bare `HH:MM` needs no date context.
 *
 * @param actual   - The submitted value.
 * @param expected - The value configured on the rule.
 * @param typeKey  - Either `date` or `time`.
 * @return Both sides as numbers, or null when either side cannot be parsed.
 */
const toTemporalPair = (
	actual: unknown,
	expected: unknown,
	typeKey: TypeKey
): [ number, number ] | null => {
	const parse = ( value: unknown ): number | null => {
		const text = toComparableString( value ).trim();
		if ( '' === text ) {
			return null;
		}
		if ( 'time' === typeKey ) {
			const match = text.match( /^(\d{1,2}):(\d{2})/ );
			if ( ! match ) {
				return null;
			}
			return Number( match[ 1 ] ) * 60 + Number( match[ 2 ] );
		}
		const stamp = Date.parse( text );
		return Number.isNaN( stamp ) ? null : stamp;
	};

	const left = parse( actual );
	const right = parse( expected );
	if ( left === null || right === null ) {
		return null;
	}
	return [ left, right ];
};

/**
 * Evaluate a single rule against the current values.
 *
 * @param rule    - The rule to evaluate.
 * @param typeKey - Comparison behavior of the rule's subject field.
 * @param actual  - The subject field's current value.
 * @return True or false, or null when the rule cannot be evaluated and must be ignored.
 */
const evaluateRuleValue = ( rule: Rule, typeKey: TypeKey, actual: unknown ): boolean | null => {
	const operator = rule.operator;
	const expected = operatorNeedsValue( operator ) ? rule.value ?? '' : '';

	switch ( operator ) {
		case OPERATORS.IS_EMPTY:
			return isEmptyValue( actual );
		case OPERATORS.IS_NOT_EMPTY:
			return ! isEmptyValue( actual );
		case OPERATORS.IS_CHECKED:
			return ! isEmptyValue( actual );
		case OPERATORS.IS_NOT_CHECKED:
			return isEmptyValue( actual );
		default:
			break;
	}

	if ( 'multichoice' === typeKey ) {
		const selection = toSelectionList( actual );
		const target = toComparableString( expected ).trim();
		switch ( operator ) {
			case OPERATORS.CONTAINS:
				return selection.includes( target );
			case OPERATORS.DOES_NOT_CONTAIN:
				return ! selection.includes( target );
			default:
				return null;
		}
	}

	if ( 'number' === typeKey ) {
		const pair = toNumericPair( actual, expected );
		if ( pair === null ) {
			return false;
		}
		const [ left, right ] = pair;
		switch ( operator ) {
			case OPERATORS.EQUALS:
				return left === right;
			case OPERATORS.NOT_EQUALS:
				return left !== right;
			case OPERATORS.GREATER_THAN:
				return left > right;
			case OPERATORS.LESS_THAN:
				return left < right;
			case OPERATORS.GTE:
				return left >= right;
			case OPERATORS.LTE:
				return left <= right;
			default:
				return null;
		}
	}

	if ( 'date' === typeKey || 'time' === typeKey ) {
		const pair = toTemporalPair( actual, expected, typeKey );
		if ( pair === null ) {
			return false;
		}
		const [ left, right ] = pair;
		switch ( operator ) {
			case OPERATORS.IS:
				return left === right;
			case OPERATORS.IS_NOT:
				return left !== right;
			case OPERATORS.BEFORE:
				return left < right;
			case OPERATORS.AFTER:
				return left > right;
			default:
				return null;
		}
	}

	// string, choice, hidden and file all compare textually.
	const left = toComparableString( actual );
	const right = toComparableString( expected );
	switch ( operator ) {
		case OPERATORS.IS:
			return left === right;
		case OPERATORS.IS_NOT:
			return left !== right;
		case OPERATORS.CONTAINS:
			return '' !== right && left.includes( right );
		case OPERATORS.DOES_NOT_CONTAIN:
			return '' === right || ! left.includes( right );
		default:
			return null;
	}
};

/**
 * Evaluate a field's conditional logic.
 *
 * A rule whose subject field is absent from `fieldTypes` is ignored rather than compared
 * against an empty value, so deleting an unrelated block cannot silently hide a field.
 * When every rule is ignored the field stays visible.
 *
 * @param logic      - The field's conditional-logic config.
 * @param fieldTypes - Map of field id to shortcode field type, for every field in the form.
 * @param values     - Map of field id to current value.
 * @return True when the field should be visible.
 */
export const evaluateLogic = (
	logic: ConditionalLogic | null | undefined,
	fieldTypes: Record< string, string >,
	values: FormValues
): boolean => {
	if ( ! logic || ! logic.enabled ) {
		return true;
	}

	const rules = logic.controls?.fieldValue?.rules;
	if ( ! Array.isArray( rules ) || 0 === rules.length ) {
		return true;
	}

	const outcomes: boolean[] = [];
	rules.forEach( rule => {
		if ( ! rule || ! rule.field || ! rule.operator ) {
			return;
		}
		if ( ! ( rule.field in fieldTypes ) ) {
			return; // Subject field no longer exists — ignore this rule.
		}
		const typeKey = getTypeKeyForFieldType( fieldTypes[ rule.field ] );
		const outcome = evaluateRuleValue( rule, typeKey, values[ rule.field ] );
		if ( outcome !== null ) {
			outcomes.push( outcome );
		}
	} );

	if ( 0 === outcomes.length ) {
		return true;
	}

	const matched =
		'all' === logic.logicalOperator ? outcomes.every( Boolean ) : outcomes.some( Boolean );

	return 'hide' === logic.action ? ! matched : matched;
};

/**
 * Resolve visibility for every field in a form at once.
 *
 * Runs to a fixed point so a hidden field's value reads as empty for everyone else: if the
 * question was never asked, its answer must not satisfy another field's condition. On
 * ambiguity — circular rules, or passes exhausted — the field is left visible, because a
 * stray value in a response is recoverable and a silently discarded answer is not.
 *
 * @param fields - Map of field id to its logic and comparison behavior.
 * @param values - Map of field id to submitted value.
 * @return Map of field id to visibility.
 */
export const resolveVisibility = (
	fields: Record< string, FieldDescriptor >,
	values: FormValues
): Record< string, boolean > => {
	const ids = Object.keys( fields );
	const visible: Record< string, boolean > = {};
	ids.forEach( id => {
		visible[ id ] = true;
	} );

	const withLogic = ids.filter( id => fields[ id ]?.logic?.enabled );
	if ( 0 === withLogic.length ) {
		return visible;
	}

	const fieldTypes: Record< string, string > = {};
	ids.forEach( id => {
		fieldTypes[ id ] = fields[ id ].type;
	} );

	// An acyclic dependency chain settles at least one more level per pass, so this bound is
	// always enough to reach a fixed point unless the rules are circular.
	const maxPasses = Math.min( withLogic.length + 1, MAX_CASCADE_PASSES );

	// Fields that change after the opening pass are reacting to another field's change, which
	// is the signature of an oscillation. Collected across every pass, because a participant in
	// a cycle need not be the one that happened to flip on the final pass.
	const unstable = new Set< string >();

	for ( let pass = 0; pass < maxPasses; pass++ ) {
		const effective: FormValues = {};
		ids.forEach( id => {
			effective[ id ] = visible[ id ] ? values[ id ] : '';
		} );

		let changedCount = 0;
		withLogic.forEach( id => {
			const next = evaluateLogic( fields[ id ].logic, fieldTypes, effective );
			if ( next !== visible[ id ] ) {
				visible[ id ] = next;
				changedCount++;
				if ( pass > 0 ) {
					unstable.add( id );
				}
			}
		} );

		if ( 0 === changedCount ) {
			return visible; // Fixed point.
		}
	}

	// Passes exhausted, so the rules are circular. Fail open for everything caught in the cycle.
	unstable.forEach( id => {
		visible[ id ] = true;
	} );

	return visible;
};
