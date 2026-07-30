import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';
import ConditionalLogicPanel from './components/panel.jsx';
import { getTypeKeyForBlockName } from './util/field-types.ts';

const FIELD_BLOCK_PREFIX = 'jetpack/field-';

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

addFilter( 'editor.BlockEdit', 'jetpack/forms-conditional-logic', withConditionalLogic );
