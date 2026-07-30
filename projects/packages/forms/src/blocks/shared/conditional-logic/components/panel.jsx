import { InspectorControls } from '@wordpress/block-editor';
import { Flex, FlexItem, Notice, PanelBody, SelectControl } from '@wordpress/components';
import { useCallback, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { normalizeLogic } from '../constants.js';
import { CONTROLS } from '../controls/index.js';
import useSubjectFields from '../hooks/use-subject-fields.js';
import ConditionalLogicPanelHeader from './panel-header.jsx';

const ACTION_OPTIONS = [
	{ value: 'show', label: __( 'Show this field', 'jetpack-forms' ) },
	{ value: 'hide', label: __( 'Hide this field', 'jetpack-forms' ) },
];

const MATCH_OPTIONS = [
	{ value: 'any', label: __( 'any', 'jetpack-forms' ) },
	{ value: 'all', label: __( 'all', 'jetpack-forms' ) },
];

/**
 * The "Conditional logic" inspector panel, injected into every field block.
 *
 * @param {object}   props               - Component props.
 * @param {string}   props.clientId      - The field block's client id.
 * @param {object}   props.attributes    - The field block's attributes.
 * @param {Function} props.setAttributes - The field block's attribute setter.
 * @return {object} The rendered panel.
 */
const ConditionalLogicPanel = ( { clientId, attributes, setAttributes } ) => {
	const [ error, setError ] = useState( null );

	const logic = useMemo(
		() => normalizeLogic( attributes.conditionalLogic ),
		[ attributes.conditionalLogic ]
	);

	const fields = useSubjectFields( clientId );

	const updateLogic = useCallback(
		next => setAttributes( { conditionalLogic: next } ),
		[ setAttributes ]
	);

	const handleActionChange = useCallback(
		action => updateLogic( { ...logic, action } ),
		[ logic, updateLogic ]
	);

	const handleMatchChange = useCallback(
		logicalOperator => updateLogic( { ...logic, logicalOperator } ),
		[ logic, updateLogic ]
	);

	const activeControls = CONTROLS.filter( control => !! logic.controls[ control.slug ] );

	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Conditional logic', 'jetpack-forms' ) }
				initialOpen={ false }
				className="jetpack-contact-form__panel jetpack-contact-form__conditional-logic"
			>
				<Flex justify="space-between" align="center">
					<FlexItem>
						<span className="jetpack-contact-form__conditional-logic-intro">
							{ activeControls.length
								? __( 'This field appears only when your conditions are met.', 'jetpack-forms' )
								: __( 'Add a condition to show or hide this field.', 'jetpack-forms' ) }
						</span>
					</FlexItem>
					<FlexItem>
						<ConditionalLogicPanelHeader
							logic={ logic }
							onChange={ updateLogic }
							onError={ setError }
						/>
					</FlexItem>
				</Flex>

				{ error && (
					<Notice status="error" isDismissible={ true } onRemove={ () => setError( null ) }>
						{ error }
					</Notice>
				) }

				{ activeControls.length > 0 && (
					<>
						<Flex
							gap={ 2 }
							align="flex-start"
							className="jetpack-contact-form__conditional-logic-summary"
						>
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
									options={ MATCH_OPTIONS }
									onChange={ handleMatchChange }
									__nextHasNoMarginBottom={ true }
									__next40pxDefaultSize={ true }
								/>
							</FlexItem>
						</Flex>

						<p className="jetpack-contact-form__conditional-logic-hint">
							{ __( 'of the following conditions are met:', 'jetpack-forms' ) }
						</p>

						{ activeControls.map( control => {
							const { Edit, slug, label } = control;
							return (
								<div key={ slug } className="jetpack-contact-form__conditional-logic-section">
									<h3 className="jetpack-contact-form__conditional-logic-section-title">
										{ label }
									</h3>
									<Edit
										value={ logic.controls[ slug ] }
										fields={ fields }
										onChange={ next =>
											updateLogic( {
												...logic,
												controls: { ...logic.controls, [ slug ]: next },
											} )
										}
									/>
								</div>
							);
						} ) }
					</>
				) }
			</PanelBody>
		</InspectorControls>
	);
};

export default ConditionalLogicPanel;
