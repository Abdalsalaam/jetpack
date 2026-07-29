import { InspectorControls } from '@wordpress/block-editor';
import {
	BaseControl,
	Button,
	Flex,
	FlexItem,
	Notice,
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useCallback, useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { OPERATORS } from '../../shared/conditional-logic/util/field-types.ts';

const DEFAULT_LOGIC = {
	enabled: false,
	action: 'show',
	logicalOperator: 'any',
	rules: [],
};

const ACTION_OPTIONS = [
	{ value: 'show', label: __( 'Show this field', 'jetpack-forms' ) },
	{ value: 'hide', label: __( 'Hide this field', 'jetpack-forms' ) },
];

const LOGICAL_OPERATOR_OPTIONS = [
	{ value: 'any', label: __( 'if any', 'jetpack-forms' ) },
	{ value: 'all', label: __( 'if all', 'jetpack-forms' ) },
];

const OPERATOR_OPTIONS = [
	{ value: OPERATORS.IS, label: __( 'is', 'jetpack-forms' ) },
	{ value: OPERATORS.IS_NOT, label: __( 'is not', 'jetpack-forms' ) },
	{ value: OPERATORS.CONTAINS, label: __( 'contains', 'jetpack-forms' ) },
	{ value: OPERATORS.DOES_NOT_CONTAIN, label: __( 'does not contain', 'jetpack-forms' ) },
	{ value: OPERATORS.IS_EMPTY, label: __( 'is empty', 'jetpack-forms' ) },
	{ value: OPERATORS.IS_NOT_EMPTY, label: __( 'is not empty', 'jetpack-forms' ) },
];

const OPERATORS_WITHOUT_VALUE = new Set( [ OPERATORS.IS_EMPTY, OPERATORS.IS_NOT_EMPTY ] );

const ELIGIBLE_SOURCE_BLOCK_NAMES = [ 'jetpack/field-text' ];

/**
 * Walk a block tree and collect eligible source fields (text fields with an id, excluding self).
 *
 * @param {Array}  blocks          - Block tree to walk.
 * @param {string} excludeClientId - The caller's clientId (excluded from results).
 * @return {Array<{id: string, label: string}>} List of eligible source fields.
 */
const collectEligibleSourceFields = ( blocks, excludeClientId ) => {
	const fields = [];
	const walk = nodes => {
		if ( ! Array.isArray( nodes ) ) {
			return;
		}
		nodes.forEach( block => {
			if (
				ELIGIBLE_SOURCE_BLOCK_NAMES.includes( block.name ) &&
				block.clientId !== excludeClientId &&
				block.attributes?.id
			) {
				const labelBlock = ( block.innerBlocks || [] ).find( ib => ib.name === 'jetpack/label' );
				const label = labelBlock?.attributes?.label || block.attributes.id;
				fields.push( { id: block.attributes.id, label } );
			}
			if ( block.innerBlocks?.length ) {
				walk( block.innerBlocks );
			}
		} );
	};
	walk( blocks );
	return fields;
};

const RuleRow = ( { rule, index, sourceFieldOptions, onChange, onRemove } ) => {
	const handleFieldChange = useCallback(
		value => onChange( index, { field: value } ),
		[ index, onChange ]
	);
	const handleOperatorChange = useCallback(
		value => onChange( index, { operator: value } ),
		[ index, onChange ]
	);
	const handleValueChange = useCallback(
		value => onChange( index, { value } ),
		[ index, onChange ]
	);
	const handleRemoveClick = useCallback( () => onRemove( index ), [ index, onRemove ] );

	const needsValue = ! OPERATORS_WITHOUT_VALUE.has( rule.operator );
	const ruleFieldMissing =
		sourceFieldOptions.length > 0 &&
		rule.field &&
		! sourceFieldOptions.some( opt => opt.value === rule.field );

	return (
		<BaseControl
			className="jetpack-contact-form__conditional-logic-rule"
			__nextHasNoMarginBottom={ true }
		>
			<Flex justify="space-between" align="center">
				<FlexItem>
					<strong>
						{ sprintf(
							/* translators: %d: condition index starting at 1 */
							__( 'Condition #%d', 'jetpack-forms' ),
							index + 1
						) }
					</strong>
				</FlexItem>
				<FlexItem>
					<Button
						size="small"
						variant="tertiary"
						isDestructive
						onClick={ handleRemoveClick }
						aria-label={ sprintf(
							/* translators: %d: condition index starting at 1 */
							__( 'Remove condition #%d', 'jetpack-forms' ),
							index + 1
						) }
					>
						{ __( 'Remove', 'jetpack-forms' ) }
					</Button>
				</FlexItem>
			</Flex>

			{ ruleFieldMissing && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'The referenced field no longer exists. Pick another field or remove this condition.',
						'jetpack-forms'
					) }
				</Notice>
			) }

			<SelectControl
				label={ __( 'Field', 'jetpack-forms' ) }
				value={ rule.field }
				options={ [
					{ value: '', label: __( 'Select a field…', 'jetpack-forms' ) },
					...sourceFieldOptions,
				] }
				onChange={ handleFieldChange }
				__nextHasNoMarginBottom={ true }
				__next40pxDefaultSize={ true }
			/>

			<SelectControl
				label={ __( 'Operator', 'jetpack-forms' ) }
				value={ rule.operator }
				options={ OPERATOR_OPTIONS }
				onChange={ handleOperatorChange }
				__nextHasNoMarginBottom={ true }
				__next40pxDefaultSize={ true }
			/>

			{ needsValue && (
				<TextControl
					label={ __( 'Value', 'jetpack-forms' ) }
					value={ rule.value ?? '' }
					onChange={ handleValueChange }
					__nextHasNoMarginBottom={ true }
					__next40pxDefaultSize={ true }
				/>
			) }
		</BaseControl>
	);
};

const ConditionalLogicPanel = ( { clientId, attributes, setAttributes } ) => {
	const logic = useMemo(
		() => ( { ...DEFAULT_LOGIC, ...( attributes.conditionalLogic || {} ) } ),
		[ attributes.conditionalLogic ]
	);

	const sourceFields = useSelect(
		select => {
			const { getBlock, getBlockParentsByBlockName, getBlockRootClientId } =
				select( 'core/block-editor' );
			const formParents = getBlockParentsByBlockName( clientId, 'jetpack/contact-form' );
			// Fall back to the immediate root when the field isn't inside a contact-form yet
			// (can happen in pattern previews and legacy layouts).
			const formClientId =
				formParents?.[ formParents.length - 1 ] || getBlockRootClientId( clientId );
			if ( ! formClientId ) {
				return [];
			}
			const form = getBlock( formClientId );
			return collectEligibleSourceFields( form?.innerBlocks || [], clientId );
		},
		[ clientId ]
	);

	const sourceFieldOptions = useMemo(
		() => sourceFields.map( field => ( { value: field.id, label: field.label } ) ),
		[ sourceFields ]
	);

	const updateLogic = useCallback(
		patch => {
			setAttributes( { conditionalLogic: { ...logic, ...patch } } );
		},
		[ logic, setAttributes ]
	);

	const handleToggleEnabled = useCallback(
		value => updateLogic( { enabled: value } ),
		[ updateLogic ]
	);
	const handleActionChange = useCallback(
		value => updateLogic( { action: value } ),
		[ updateLogic ]
	);
	const handleLogicalOperatorChange = useCallback(
		value => updateLogic( { logicalOperator: value } ),
		[ updateLogic ]
	);

	const updateRule = useCallback(
		( index, patch ) => {
			const nextRules = logic.rules.map( ( rule, i ) =>
				i === index ? { ...rule, ...patch } : rule
			);
			updateLogic( { rules: nextRules } );
		},
		[ logic.rules, updateLogic ]
	);

	const addRule = useCallback( () => {
		const defaultField = sourceFields[ 0 ]?.id || '';
		updateLogic( {
			rules: [ ...logic.rules, { field: defaultField, operator: OPERATORS.IS, value: '' } ],
		} );
	}, [ logic.rules, sourceFields, updateLogic ] );

	const removeRule = useCallback(
		index => {
			updateLogic( { rules: logic.rules.filter( ( _, i ) => i !== index ) } );
		},
		[ logic.rules, updateLogic ]
	);

	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Conditional logic', 'jetpack-forms' ) }
				initialOpen={ false }
				className="jetpack-contact-form__panel jetpack-contact-form__conditional-logic"
			>
				<ToggleControl
					label={ __( 'Enable conditional logic', 'jetpack-forms' ) }
					checked={ !! logic.enabled }
					onChange={ handleToggleEnabled }
					__nextHasNoMarginBottom={ true }
				/>

				{ logic.enabled && (
					<>
						<Flex gap={ 2 } align="flex-start" style={ { marginTop: 12 } }>
							<FlexItem>
								<SelectControl
									label={ __( 'Action', 'jetpack-forms' ) }
									hideLabelFromVision
									value={ logic.action }
									options={ ACTION_OPTIONS }
									onChange={ handleActionChange }
									__nextHasNoMarginBottom={ true }
									__next40pxDefaultSize={ true }
								/>
							</FlexItem>
							<FlexItem>
								<SelectControl
									label={ __( 'Match type', 'jetpack-forms' ) }
									hideLabelFromVision
									value={ logic.logicalOperator }
									options={ LOGICAL_OPERATOR_OPTIONS }
									onChange={ handleLogicalOperatorChange }
									__nextHasNoMarginBottom={ true }
									__next40pxDefaultSize={ true }
								/>
							</FlexItem>
						</Flex>

						<p className="jetpack-contact-form__conditional-logic-hint">
							{ __( 'of the following conditions are met:', 'jetpack-forms' ) }
						</p>

						{ sourceFieldOptions.length === 0 && (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'Add another text field to this form to use as a condition.',
									'jetpack-forms'
								) }
							</Notice>
						) }

						{ logic.rules.map( ( rule, index ) => (
							<RuleRow
								key={ index }
								rule={ rule }
								index={ index }
								sourceFieldOptions={ sourceFieldOptions }
								onChange={ updateRule }
								onRemove={ removeRule }
							/>
						) ) }

						<Button
							variant="secondary"
							onClick={ addRule }
							disabled={ sourceFieldOptions.length === 0 }
							style={ { marginTop: 12 } }
						>
							{ __( 'Add condition', 'jetpack-forms' ) }
						</Button>
					</>
				) }
			</PanelBody>
		</InspectorControls>
	);
};

export default ConditionalLogicPanel;
