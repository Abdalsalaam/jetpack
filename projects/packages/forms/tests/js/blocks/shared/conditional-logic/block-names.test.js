import fs from 'fs';
import path from 'path';
import { getOperatorsForTypeKey } from '../../../../../src/blocks/shared/conditional-logic/util/field-types';

/**
 * Every field block declares how its value is compared, beside `form_editor`.
 *
 * This reads the block sources rather than restating the block list, for two reasons. A new
 * field block that forgets the declaration is reported here instead of silently getting no
 * conditional-logic support. And the registered name is taken from the block itself: two
 * blocks register under a name that differs from their directory — `field-single-choice` as
 * `jetpack/field-radio`, `field-multiple-choice` as `jetpack/field-checkbox-multiple` — and a
 * hand-written table got both wrong, which is how both silently lost their panel once.
 */
const BLOCKS_DIR = path.join( process.cwd(), 'src/blocks' );

const readFieldBlocks = () =>
	fs
		.readdirSync( BLOCKS_DIR )
		.filter( entry => entry.startsWith( 'field-' ) )
		.map( dir => {
			const indexFile = fs
				.readdirSync( path.join( BLOCKS_DIR, dir ) )
				.find( file => /^index\.(js|jsx|ts|tsx)$/.test( file ) );

			if ( ! indexFile ) {
				return null;
			}

			const source = fs.readFileSync( path.join( BLOCKS_DIR, dir, indexFile ), 'utf8' );
			const name = source.match( /^(?:export )?const name = '([^']+)'/m );
			const type = source.match( /export const conditional_logic = \{\s*type: '([a-z]+)'/m );

			return {
				dir,
				blockName: name ? `jetpack/${ name[ 1 ] }` : null,
				type: type ? type[ 1 ] : null,
				// Declared but not exported would leave it invisible to the lookup.
				exported: /export default \{[^}]*conditional_logic/s.test( source ),
			};
		} )
		.filter( Boolean );

// The expected comparison behavior of each field block, keyed by registered block name.
const EXPECTED_TYPES = {
	'jetpack/field-text': 'string',
	'jetpack/field-name': 'string',
	'jetpack/field-email': 'string',
	'jetpack/field-url': 'string',
	'jetpack/field-textarea': 'string',
	'jetpack/field-telephone': 'string',
	'jetpack/field-select': 'choice',
	'jetpack/field-radio': 'choice',
	'jetpack/field-image-select': 'choice',
	'jetpack/field-checkbox-multiple': 'multichoice',
	'jetpack/field-number': 'number',
	'jetpack/field-slider': 'number',
	'jetpack/field-rating': 'number',
	'jetpack/field-date': 'date',
	'jetpack/field-time': 'time',
	'jetpack/field-checkbox': 'boolean',
	'jetpack/field-consent': 'boolean',
	'jetpack/field-hidden': 'hidden',
	'jetpack/field-file': 'file',
};

describe( 'field block conditional-logic declarations', () => {
	const blocks = readFieldBlocks();

	it( 'finds every field block in the package', () => {
		expect( blocks ).toHaveLength( 19 );
		expect( Object.keys( EXPECTED_TYPES ) ).toHaveLength( 19 );
	} );

	it( 'registers the block names the table expects', () => {
		expect( blocks.map( block => block.blockName ).sort() ).toEqual(
			Object.keys( EXPECTED_TYPES ).sort()
		);
	} );

	it.each( readFieldBlocks().map( block => [ block.dir, block ] ) )(
		'%s declares and exports its comparison behavior',
		( dir, block ) => {
			expect( block.type ).toBe( EXPECTED_TYPES[ block.blockName ] );
			expect( block.exported ).toBe( true );
			// The declared type must be one the rule builder can offer operators for.
			expect( getOperatorsForTypeKey( block.type ).length ).toBeGreaterThan( 0 );
		}
	);
} );
