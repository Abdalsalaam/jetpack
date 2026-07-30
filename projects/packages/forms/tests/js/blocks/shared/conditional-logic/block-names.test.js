import fs from 'fs';
import path from 'path';
import { TYPE_KEY_BY_BLOCK_NAME } from '../../../../../src/blocks/shared/conditional-logic/util/field-types';

/**
 * Derive the block names from the source rather than from directory names.
 *
 * Regression guard: the mapping table was first written from directory names, which meant
 * field-single-choice/ and field-multiple-choice/ — registered as `jetpack/field-radio` and
 * `jetpack/field-checkbox-multiple` — had no entry, so those two field types silently got no
 * conditional-logic panel and could not be referenced by a condition. Hardcoding the list in
 * a test would have repeated the same wrong assumption, so this reads what is registered.
 */
const BLOCKS_DIR = path.join( process.cwd(), 'src/blocks' );

const registeredFieldBlockNames = () =>
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
			const match = source.match( /^(?:export )?const name = '([^']+)'/m );

			return match ? { dir, blockName: `jetpack/${ match[ 1 ] }` } : null;
		} )
		.filter( Boolean );

describe( 'field block name coverage', () => {
	const blocks = registeredFieldBlockNames();

	it( 'finds every field block in the package', () => {
		expect( blocks ).toHaveLength( 19 );
	} );

	it.each( blocks.map( block => [ block.dir, block.blockName ] ) )(
		'%s registers as %s and has a conditional-logic type mapping',
		( dir, blockName ) => {
			expect( TYPE_KEY_BY_BLOCK_NAME[ blockName ] ).toBeDefined();
		}
	);

	it( 'maps exactly the registered blocks, with no stale entries', () => {
		const registered = blocks.map( block => block.blockName ).sort();
		const mapped = Object.keys( TYPE_KEY_BY_BLOCK_NAME ).sort();

		expect( mapped ).toEqual( registered );
	} );

	it( 'covers the two blocks whose registered name differs from their directory', () => {
		const byDir = Object.fromEntries( blocks.map( block => [ block.dir, block.blockName ] ) );

		expect( byDir[ 'field-single-choice' ] ).toBe( 'jetpack/field-radio' );
		expect( byDir[ 'field-multiple-choice' ] ).toBe( 'jetpack/field-checkbox-multiple' );
		expect( TYPE_KEY_BY_BLOCK_NAME[ 'jetpack/field-radio' ] ).toBe( 'choice' );
		expect( TYPE_KEY_BY_BLOCK_NAME[ 'jetpack/field-checkbox-multiple' ] ).toBe( 'multichoice' );
	} );
} );
