import { hasFilter } from '@wordpress/hooks';
import {
	FILTER_NAMESPACE,
	isConditionalLogicField,
	registerConditionalLogicFilter,
} from '../../../../../src/blocks/shared/conditional-logic/register.jsx';

// Every field block in the package. If a new jetpack/field-* block is added without a type
// mapping, this list and field-types.ts disagree and the mapping test fails first.
const FIELD_BLOCKS = [
	'jetpack/field-text',
	'jetpack/field-name',
	'jetpack/field-email',
	'jetpack/field-url',
	'jetpack/field-textarea',
	'jetpack/field-telephone',
	'jetpack/field-select',
	'jetpack/field-single-choice',
	'jetpack/field-image-select',
	'jetpack/field-multiple-choice',
	'jetpack/field-number',
	'jetpack/field-slider',
	'jetpack/field-rating',
	'jetpack/field-date',
	'jetpack/field-time',
	'jetpack/field-checkbox',
	'jetpack/field-consent',
	'jetpack/field-hidden',
	'jetpack/field-file',
];

describe( 'conditional logic registration', () => {
	it( 'covers all 19 field blocks', () => {
		expect( FIELD_BLOCKS ).toHaveLength( 19 );
	} );

	it.each( FIELD_BLOCKS )( 'applies to %s', name => {
		expect( isConditionalLogicField( name ) ).toBe( true );
	} );

	// jetpack/input imports the same shared settings and therefore carries the attribute, but
	// it is an inner input, not a field, so it must not get a panel of its own.
	it.each( [
		'jetpack/input',
		'jetpack/input-image-option',
		'jetpack/contact-form',
		'jetpack/label',
		'jetpack/option',
		'jetpack/options',
		'jetpack/form-step',
		'jetpack/fieldset-image-options',
		'core/paragraph',
		'core/heading',
	] )( 'does not apply to %s', name => {
		expect( isConditionalLogicField( name ) ).toBe( false );
	} );

	it( 'tolerates a missing or non-string block name', () => {
		expect( isConditionalLogicField( undefined ) ).toBe( false );
		expect( isConditionalLogicField( null ) ).toBe( false );
		expect( isConditionalLogicField( '' ) ).toBe( false );
		expect( isConditionalLogicField( 42 ) ).toBe( false );
	} );

	it( 'skips a field-prefixed block with no comparison behavior', () => {
		expect( isConditionalLogicField( 'jetpack/field-not-a-real-type' ) ).toBe( false );
	} );

	// Regression: this module ships in both dist/blocks/editor.js and
	// dist/form-editor/jetpack-form-editor.js, and the Forms editor screen loads both.
	// addFilter does not de-duplicate by namespace, so an unguarded registration wrapped
	// BlockEdit twice and rendered the panel twice.
	describe( 'filter registration', () => {
		it( 'registers the BlockEdit filter', () => {
			expect( hasFilter( 'editor.BlockEdit', FILTER_NAMESPACE ) ).toBeTruthy();
		} );

		it( 'declines to register a second time', () => {
			// Importing the module already registered it; a second bundle calling in must be
			// a no-op rather than adding another wrapper.
			expect( registerConditionalLogicFilter() ).toBe( false );
			expect( registerConditionalLogicFilter() ).toBe( false );
			expect( hasFilter( 'editor.BlockEdit', FILTER_NAMESPACE ) ).toBeTruthy();
		} );
	} );
} );
