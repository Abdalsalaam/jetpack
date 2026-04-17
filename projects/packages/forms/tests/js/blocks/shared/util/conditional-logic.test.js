import {
	OPERATORS,
	evaluateConditionalLogic,
} from '../../../../../src/blocks/shared/util/conditional-logic';

const logic = ( overrides = {} ) => ( {
	enabled: true,
	action: 'show',
	logicalOperator: 'any',
	rules: [],
	...overrides,
} );

describe( 'evaluateConditionalLogic', () => {
	describe( 'short-circuits', () => {
		it( 'returns visible when logic is null or undefined', () => {
			expect( evaluateConditionalLogic( null, {} ) ).toEqual( { visible: true } );
			expect( evaluateConditionalLogic( undefined, {} ) ).toEqual( { visible: true } );
		} );

		it( 'returns visible when disabled', () => {
			expect(
				evaluateConditionalLogic(
					logic( {
						enabled: false,
						rules: [ { field: 'a', operator: OPERATORS.IS, value: 'x' } ],
					} ),
					{ a: 'not-x' }
				)
			).toEqual( { visible: true } );
		} );

		it( 'returns visible when rules array is empty', () => {
			expect( evaluateConditionalLogic( logic(), {} ) ).toEqual( { visible: true } );
		} );
	} );

	describe( 'operators', () => {
		it( 'is: matches exact string', () => {
			const config = logic( { rules: [ { field: 'a', operator: OPERATORS.IS, value: 'x' } ] } );
			expect( evaluateConditionalLogic( config, { a: 'x' } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: 'y' } ).visible ).toBe( false );
		} );

		it( 'is_not: matches inequality', () => {
			const config = logic( { rules: [ { field: 'a', operator: OPERATORS.IS_NOT, value: 'x' } ] } );
			expect( evaluateConditionalLogic( config, { a: 'x' } ).visible ).toBe( false );
			expect( evaluateConditionalLogic( config, { a: 'y' } ).visible ).toBe( true );
		} );

		it( 'contains: substring match', () => {
			const config = logic( {
				rules: [ { field: 'a', operator: OPERATORS.CONTAINS, value: 'foo' } ],
			} );
			expect( evaluateConditionalLogic( config, { a: 'foobar' } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: 'baz' } ).visible ).toBe( false );
		} );

		it( 'does_not_contain: substring mismatch', () => {
			const config = logic( {
				rules: [ { field: 'a', operator: OPERATORS.DOES_NOT_CONTAIN, value: 'foo' } ],
			} );
			expect( evaluateConditionalLogic( config, { a: 'foobar' } ).visible ).toBe( false );
			expect( evaluateConditionalLogic( config, { a: 'baz' } ).visible ).toBe( true );
		} );

		it( 'is_empty: true for empty strings, whitespace, null, undefined, missing', () => {
			const config = logic( {
				rules: [ { field: 'a', operator: OPERATORS.IS_EMPTY } ],
			} );
			expect( evaluateConditionalLogic( config, { a: '' } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: '   ' } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: null } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: undefined } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, {} ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: 'hi' } ).visible ).toBe( false );
		} );

		it( 'is_not_empty: inverse of is_empty', () => {
			const config = logic( {
				rules: [ { field: 'a', operator: OPERATORS.IS_NOT_EMPTY } ],
			} );
			expect( evaluateConditionalLogic( config, { a: 'hi' } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: '' } ).visible ).toBe( false );
			expect( evaluateConditionalLogic( config, {} ).visible ).toBe( false );
		} );

		it( 'unknown operator does not match', () => {
			const config = logic( { rules: [ { field: 'a', operator: 'bogus', value: 'x' } ] } );
			expect( evaluateConditionalLogic( config, { a: 'x' } ).visible ).toBe( false );
		} );
	} );

	describe( 'logicalOperator', () => {
		const twoRules = {
			rules: [
				{ field: 'a', operator: OPERATORS.IS, value: 'x' },
				{ field: 'b', operator: OPERATORS.IS, value: 'y' },
			],
		};

		it( 'any: visible when at least one rule matches', () => {
			const config = logic( { logicalOperator: 'any', ...twoRules } );
			expect( evaluateConditionalLogic( config, { a: 'x', b: 'no' } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: 'no', b: 'y' } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: 'no', b: 'no' } ).visible ).toBe( false );
		} );

		it( 'all: visible only when every rule matches', () => {
			const config = logic( { logicalOperator: 'all', ...twoRules } );
			expect( evaluateConditionalLogic( config, { a: 'x', b: 'y' } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: 'x', b: 'no' } ).visible ).toBe( false );
			expect( evaluateConditionalLogic( config, { a: 'no', b: 'y' } ).visible ).toBe( false );
		} );
	} );

	describe( 'action', () => {
		const rule = { rules: [ { field: 'a', operator: OPERATORS.IS, value: 'x' } ] };

		it( 'show: visible when rules match', () => {
			const config = logic( { action: 'show', ...rule } );
			expect( evaluateConditionalLogic( config, { a: 'x' } ).visible ).toBe( true );
			expect( evaluateConditionalLogic( config, { a: 'y' } ).visible ).toBe( false );
		} );

		it( 'hide: inverts the match', () => {
			const config = logic( { action: 'hide', ...rule } );
			expect( evaluateConditionalLogic( config, { a: 'x' } ).visible ).toBe( false );
			expect( evaluateConditionalLogic( config, { a: 'y' } ).visible ).toBe( true );
		} );
	} );

	describe( 'edge cases', () => {
		it( 'unknown source field is treated as empty', () => {
			const config = logic( {
				rules: [ { field: 'missing', operator: OPERATORS.IS_EMPTY } ],
			} );
			expect( evaluateConditionalLogic( config, { a: 'x' } ).visible ).toBe( true );
		} );

		it( 'array values compare as comma-joined strings for contains', () => {
			const config = logic( {
				rules: [ { field: 'a', operator: OPERATORS.CONTAINS, value: 'bar' } ],
			} );
			expect( evaluateConditionalLogic( config, { a: [ 'foo', 'bar' ] } ).visible ).toBe( true );
		} );

		it( 'missing rules array resolves to visible', () => {
			expect(
				evaluateConditionalLogic(
					{ enabled: true, action: 'show', logicalOperator: 'any' },
					{ a: 'x' }
				).visible
			).toBe( true );
		} );
	} );
} );
