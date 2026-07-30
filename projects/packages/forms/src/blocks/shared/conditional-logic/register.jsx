import { hasFeatureFlag } from '@automattic/jetpack-shared-extension-utils';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter, hasFilter } from '@wordpress/hooks';
import ConditionalLogicPanel from './components/panel.jsx';
import { getTypeKeyForBlockName } from './util/field-types.ts';

const FIELD_BLOCK_PREFIX = 'jetpack/field-';

export const FILTER_NAMESPACE = 'jetpack/forms-conditional-logic';

export const FEATURE_FLAG = 'form-conditional-logic';

/**
 * Whether a block should carry the conditional-logic panel.
 *
 * Guarding on the type mapping as well as the name prefix means a future `jetpack/field-*`
 * block with no comparison behavior is skipped rather than rendering a panel whose operator
 * list would be empty.
 *
 * @param {string} name - Fully qualified block name.
 * @return {boolean} True when the panel applies.
 */
export const isConditionalLogicField = name =>
	typeof name === 'string' &&
	name.startsWith( FIELD_BLOCK_PREFIX ) &&
	getTypeKeyForBlockName( name ) !== null;

/**
 * Add the conditional-logic panel to every Jetpack form field block.
 *
 * A filter rather than per-block wiring: the field blocks share no single inspector
 * component — four of them build their own — so this is the only way to cover all of them
 * without touching nineteen edit files, and new field types inherit it automatically.
 */
export const withConditionalLogic = createHigherOrderComponent(
	BlockEdit => props => {
		if ( ! isConditionalLogicField( props.name ) ) {
			return <BlockEdit { ...props } />;
		}

		return (
			<>
				<BlockEdit { ...props } />
				<ConditionalLogicPanel
					clientId={ props.clientId }
					attributes={ props.attributes }
					setAttributes={ props.setAttributes }
				/>
			</>
		);
	},
	'withConditionalLogic'
);

/**
 * Register the panel filter, at most once.
 *
 * This module ships in two bundles that load together on the Forms editor screen:
 * `enqueue_block_editor_assets` enqueues dist/blocks/editor.js on every block editor screen,
 * and the Forms editor enqueues dist/form-editor/jetpack-form-editor.js on top of it.
 * addFilter does not de-duplicate by namespace, so an unguarded registration wraps BlockEdit
 * twice and renders the panel twice.
 *
 * @return {boolean} True when this call registered the filter, false when it was already there.
 */
export const registerConditionalLogicFilter = () => {
	// Off by default while the feature is in testing. The same switch gates the PHP runtime,
	// so the editor can never offer conditions the front end would ignore.
	if ( ! hasFeatureFlag( FEATURE_FLAG ) ) {
		return false;
	}

	if ( hasFilter( 'editor.BlockEdit', FILTER_NAMESPACE ) ) {
		return false;
	}

	addFilter( 'editor.BlockEdit', FILTER_NAMESPACE, withConditionalLogic );

	return true;
};

registerConditionalLogicFilter();
