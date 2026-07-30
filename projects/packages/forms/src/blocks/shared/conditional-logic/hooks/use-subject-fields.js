import { useSelect } from '@wordpress/data';
import { getFieldOptions } from '../util/field-options.ts';
import { getTypeKeyForBlockName } from '../util/field-types.ts';

/**
 * Read a field block's visible label, falling back to its id.
 *
 * @param {object} block - The field block instance.
 * @return {string} A label suitable for the subject dropdown.
 */
const getFieldLabel = block => {
	const labelBlock = ( block.innerBlocks || [] ).find( inner => inner.name === 'jetpack/label' );
	const label = labelBlock?.attributes?.label;
	return label && label.trim() ? label.trim() : block.attributes?.id;
};

/**
 * Walk a form's block tree collecting fields that can be referenced by a condition.
 *
 * @param {Array}  blocks    - Blocks to walk.
 * @param {string} excludeId - Client id to skip (the field owning the panel).
 * @param {number} step      - Current step number, or null outside a multi-step form.
 * @param {Array}  found     - Accumulator.
 */
const walk = ( blocks, excludeId, step, found ) => {
	if ( ! Array.isArray( blocks ) ) {
		return;
	}

	let currentStep = step;

	blocks.forEach( block => {
		if ( ! block ) {
			return;
		}

		if ( 'jetpack/form-step' === block.name ) {
			currentStep = ( currentStep || 0 ) + 1;
		}

		const typeKey = getTypeKeyForBlockName( block.name );

		if ( typeKey && block.clientId !== excludeId && block.attributes?.id ) {
			found.push( {
				id: block.attributes.id,
				label: getFieldLabel( block ),
				typeKey,
				options: getFieldOptions( block ),
				step: currentStep,
			} );
			return; // A field's own inner blocks hold its inputs, not other fields.
		}

		walk( block.innerBlocks, excludeId, currentStep, found );
	} );
};

/**
 * Collect the fields a condition on `clientId` may reference.
 *
 * Returns every other field in the same form, annotated with the comparison behavior and
 * option list the rule builder needs, plus the step it sits in so the dropdown can group
 * them — a rule referencing a later step always compares against an empty value, and the
 * author should be able to see that rather than be silently prevented from writing it.
 *
 * @param {string} clientId - The field block owning the panel.
 * @return {Array} Subject field descriptors.
 */
const useSubjectFields = clientId =>
	useSelect(
		select => {
			const { getBlock, getBlockParentsByBlockName, getBlockRootClientId } =
				select( 'core/block-editor' );

			const formParents = getBlockParentsByBlockName( clientId, 'jetpack/contact-form' );
			// Fall back to the immediate root when the field is not inside a contact form yet,
			// which happens in pattern previews and legacy layouts.
			const formClientId =
				formParents?.[ formParents.length - 1 ] || getBlockRootClientId( clientId );

			if ( ! formClientId ) {
				return [];
			}

			const form = getBlock( formClientId );
			const found = [];
			walk( form?.innerBlocks || [], clientId, null, found );

			return found;
		},
		[ clientId ]
	);

export default useSubjectFields;
