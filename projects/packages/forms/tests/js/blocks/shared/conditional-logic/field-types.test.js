import {
	OPERATORS,
	getTypeKeyForBlockName,
	getOperatorsForTypeKey,
	getValueInputForTypeKey,
	operatorNeedsValue,
} from '../../../../../src/blocks/shared/conditional-logic/util/field-types';

// One row per jetpack field block: [ block name, type key, value input kind ].
const CASES = [
	[ 'jetpack/field-text', 'string', 'text' ],
	[ 'jetpack/field-name', 'string', 'text' ],
	[ 'jetpack/field-email', 'string', 'text' ],
	[ 'jetpack/field-url', 'string', 'text' ],
	[ 'jetpack/field-textarea', 'string', 'text' ],
	[ 'jetpack/field-telephone', 'string', 'text' ],
	[ 'jetpack/field-select', 'choice', 'options' ],
	[ 'jetpack/field-radio', 'choice', 'options' ],
	[ 'jetpack/field-image-select', 'choice', 'options' ],
	[ 'jetpack/field-checkbox-multiple', 'multichoice', 'options' ],
	[ 'jetpack/field-number', 'number', 'number' ],
	[ 'jetpack/field-slider', 'number', 'number' ],
	[ 'jetpack/field-rating', 'number', 'number' ],
	[ 'jetpack/field-date', 'date', 'date' ],
	[ 'jetpack/field-time', 'time', 'time' ],
	[ 'jetpack/field-checkbox', 'boolean', 'none' ],
	[ 'jetpack/field-consent', 'boolean', 'none' ],
	[ 'jetpack/field-hidden', 'hidden', 'text' ],
	[ 'jetpack/field-file', 'file', 'none' ],
];

const EXPECTED_OPERATORS = {
	string: [ 'is', 'is_not', 'contains', 'does_not_contain', 'is_empty', 'is_not_empty' ],
	choice: [ 'is', 'is_not', 'is_empty', 'is_not_empty' ],
	multichoice: [ 'contains', 'does_not_contain', 'is_empty', 'is_not_empty' ],
	number: [
		'equals',
		'not_equals',
		'greater_than',
		'less_than',
		'gte',
		'lte',
		'is_empty',
		'is_not_empty',
	],
	date: [ 'is', 'is_not', 'before', 'after' ],
	time: [ 'is', 'is_not', 'before', 'after' ],
	boolean: [ 'is_checked', 'is_not_checked' ],
	hidden: [ 'is', 'is_not', 'contains' ],
	file: [ 'is_empty', 'is_not_empty' ],
};

describe( 'field-types', () => {
	it( 'covers every jetpack field block', () => {
		expect( CASES ).toHaveLength( 19 );
	} );

	it.each( CASES )( '%s maps to type key %s with a %s value input', ( name, typeKey, input ) => {
		expect( getTypeKeyForBlockName( name ) ).toBe( typeKey );
		expect( getValueInputForTypeKey( typeKey ) ).toBe( input );
	} );

	it.each( CASES )( '%s exposes the operator set for %s', ( name, typeKey ) => {
		expect( getOperatorsForTypeKey( typeKey ) ).toEqual( EXPECTED_OPERATORS[ typeKey ] );
	} );

	it( 'returns null for blocks that are not fields', () => {
		expect( getTypeKeyForBlockName( 'jetpack/input' ) ).toBeNull();
		expect( getTypeKeyForBlockName( 'jetpack/contact-form' ) ).toBeNull();
		expect( getTypeKeyForBlockName( 'jetpack/label' ) ).toBeNull();
		expect( getTypeKeyForBlockName( 'core/paragraph' ) ).toBeNull();
		expect( getTypeKeyForBlockName( undefined ) ).toBeNull();
	} );

	it( 'returns an empty operator list for an unknown type key', () => {
		expect( getOperatorsForTypeKey( 'nonsense' ) ).toEqual( [] );
		expect( getValueInputForTypeKey( 'nonsense' ) ).toBe( 'text' );
	} );

	it( 'knows which operators take no value operand', () => {
		expect( operatorNeedsValue( OPERATORS.IS ) ).toBe( true );
		expect( operatorNeedsValue( OPERATORS.CONTAINS ) ).toBe( true );
		expect( operatorNeedsValue( OPERATORS.GREATER_THAN ) ).toBe( true );
		expect( operatorNeedsValue( OPERATORS.BEFORE ) ).toBe( true );
		expect( operatorNeedsValue( OPERATORS.IS_EMPTY ) ).toBe( false );
		expect( operatorNeedsValue( OPERATORS.IS_NOT_EMPTY ) ).toBe( false );
		expect( operatorNeedsValue( OPERATORS.IS_CHECKED ) ).toBe( false );
		expect( operatorNeedsValue( OPERATORS.IS_NOT_CHECKED ) ).toBe( false );
	} );
} );
