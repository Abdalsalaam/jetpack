import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

/**
 * The panel is loaded through a lazy boundary, so that a site with the feature off never
 * fetches, parses or runs any of it.
 *
 * That boundary is invisible to every other test here: panel.test.jsx imports the panel
 * directly, and register.test.js only inspects the guard. Nothing rendered the wrapped
 * BlockEdit, so a broken `lazy()`/`Suspense` pair would have shown up as an empty inspector in
 * the browser and a green suite -- which is how two earlier defects on this feature survived.
 */

await jest.unstable_mockModule( '@automattic/jetpack-shared-extension-utils', () => ( {
	hasFeatureFlag: () => true,
} ) );

await jest.unstable_mockModule( '../../../../../src/blocks/contact-form/child-blocks.js', () => ( {
	childBlocks: [ { name: 'field-text', conditional_logic: { type: 'string' } } ],
} ) );

await jest.unstable_mockModule( '@wordpress/block-editor', () => ( {
	InspectorControls: ( { children } ) => <div>{ children }</div>,
} ) );

await jest.unstable_mockModule(
	'../../../../../src/blocks/shared/conditional-logic/hooks/use-subject-fields.js',
	() => ( {
		__esModule: true,
		default: () => [],
		useEnsureFieldId: () => () => 'field_1',
	} )
);

const { withConditionalLogic } = await import(
	'../../../../../src/blocks/shared/conditional-logic/register.jsx'
);

// Transform the panel and its dependency tree up front. Without this the first render pays
// for compiling the whole subtree, which overruns findBy's default timeout once the full
// suite saturates the workers -- a failure about machine load, not about the code.
await import( '../../../../../src/blocks/shared/conditional-logic/components/panel.jsx' );

const noop = () => {};
const BlockEdit = ( { name } ) => <div>edit: { name }</div>;
const WrappedBlockEdit = withConditionalLogic( BlockEdit );

const renderBlock = name =>
	render(
		<WrappedBlockEdit name={ name } clientId="abc" attributes={ {} } setAttributes={ noop } />
	);

describe( 'withConditionalLogic', () => {
	it( 'resolves the lazily loaded panel and mounts it on a field block', async () => {
		renderBlock( 'jetpack/field-text' );

		// The wrapped editor is available immediately; the panel arrives only once the lazy
		// boundary resolves, so this has to be awaited rather than queried synchronously.
		expect( screen.getByText( 'edit: jetpack/field-text' ) ).toBeInTheDocument();
		await expect(
			screen.findByRole( 'button', { name: 'Conditional logic' } )
		).resolves.toBeInTheDocument();
	} );

	it( 'renders a non-field block untouched, without loading the panel', () => {
		renderBlock( 'core/paragraph' );

		expect( screen.getByText( 'edit: core/paragraph' ) ).toBeInTheDocument();
		// Nothing to await: the lazy import is never reached for a block that has no
		// conditional-logic support.
		expect( screen.queryByRole( 'button', { name: 'Conditional logic' } ) ).not.toBeInTheDocument();
	} );
} );
