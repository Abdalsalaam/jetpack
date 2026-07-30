import {
	BaseControl,
	Button,
	Flex,
	FlexItem,
	Notice,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { useCallback, useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	OPERATORS,
	getOperatorsForTypeKey,
	getValueInputForTypeKey,
	operatorNeedsValue,
} from '../../util/field-types.ts';
import { getOperatorLabel } from '../../util/operator-labels.ts';

/**
 * HTML input type for each value-input kind that renders a text box.
 */
const INPUT_TYPE_BY_KIND = {
	number: 'number',
	date: 'date',
	time: 'time',
};

/**
 * Default operator for a newly added rule, chosen from the subject field's own operator set
 * so the rule is valid the moment it appears.
 *
 * @param {string} typeKey - The subject field's comparison behavior.
 * @return {string} Operator wire string.
 */
const defaultOperatorFor = typeKey => {
	const operators = getOperatorsForTypeKey( typeKey );
	return operators.length ? operators[ 0 ] : OPERATORS.IS;
};

/**
 * The value control for a rule, chosen by the subject field's type.
 *
 * @param {object}   props          - Component props.
 * @param {object}   props.rule     - The rule being edited.
 * @param {object}   props.subject  - The subject field descriptor.
 * @param {Function} props.onChange - Called with the new value.
 * @return {object|null} The rendered control, or null when the operator takes no value.
 */
const RuleValueControl = ( { rule, subject, onChange } ) => {
	if ( ! operatorNeedsValue( rule.operator ) ) {
		return null;
	}

	const kind = getValueInputForTypeKey( subject?.typeKey || 'string' );

	if ( 'none' === kind ) {
		return null;
	}

	const value = rule.value ?? '';
	const label = __( 'Value', 'jetpack-forms' );

	if ( 'options' === kind ) {
		const options = subject?.options || [];

		if ( ! options.length ) {
			return (
				<Notice status="warning" isDismissible={ false }>
					{ __( 'This field has no options yet. Add one to compare against it.', 'jetpack-forms' ) }
				</Notice>
			);
		}

		return (
			<SelectControl
				label={ label }
				value={ value }
				options={ [ { value: '', label: __( 'Select an option…', 'jetpack-forms' ) }, ...options ] }
				onChange={ onChange }
				__nextHasNoMarginBottom={ true }
				__next40pxDefaultSize={ true }
			/>
		);
	}

	const type = INPUT_TYPE_BY_KIND[ kind ] || 'text';

	return (
		<TextControl
			label={ label }
			type={ type }
			value={ value }
			onChange={ onChange }
			__nextHasNoMarginBottom={ true }
			__next40pxDefaultSize={ true }
		/>
	);
};

/**
 * A single condition row: subject field, operator, and value.
 *
 * @param {object}   props          - Component props.
 * @param {object}   props.rule     - The rule being edited.
 * @param {number}   props.index    - Zero-based rule index.
 * @param {Array}    props.fields   - Available subject fields.
 * @param {Function} props.onChange - Called with (index, patch).
 * @param {Function} props.onRemove - Called with (index).
 * @return {object} The rendered rule row.
 */
const RuleRow = ( { rule, index, fields, onChange, onRemove } ) => {
	const subject = fields.find( field => field.id === rule.field );
	const missingSubject = rule.field && ! subject;

	const handleFieldChange = useCallback(
		fieldId => {
			const nextSubject = fields.find( field => field.id === fieldId );
			const operators = getOperatorsForTypeKey( nextSubject?.typeKey || 'string' );
			// Switching subject can invalidate the operator (a number field has no "contains"),
			// so fall back to the new type's first operator rather than leaving a dead rule.
			const operator = operators.includes( rule.operator )
				? rule.operator
				: defaultOperatorFor( nextSubject?.typeKey );

			onChange( index, { field: fieldId, operator, value: '' } );
		},
		[ fields, index, onChange, rule.operator ]
	);

	const handleOperatorChange = useCallback(
		operator => onChange( index, { operator } ),
		[ index, onChange ]
	);

	const handleValueChange = useCallback(
		value => onChange( index, { value } ),
		[ index, onChange ]
	);

	const handleRemove = useCallback( () => onRemove( index ), [ index, onRemove ] );

	const operators = getOperatorsForTypeKey( subject?.typeKey || 'string' );

	// Group by step so an author can see that a later-step field is not yet answered when
	// this one is evaluated.
	const grouped = fields.reduce( ( groups, field ) => {
		const key = field.step
			? sprintf(
					/* translators: %d: step number in a multi-step form */
					__( 'Step %d', 'jetpack-forms' ),
					field.step
			  )
			: __( 'Fields', 'jetpack-forms' );
		groups[ key ] = groups[ key ] || [];
		groups[ key ].push( field );
		return groups;
	}, {} );

	return (
		<BaseControl
			className="jetpack-contact-form__conditional-logic-rule"
			__nextHasNoMarginBottom={ true }
		>
			<Flex justify="space-between" align="center">
				<FlexItem>
					<strong>
						{ sprintf(
							/* translators: %d: condition number, starting at 1 */
							__( 'Condition %d', 'jetpack-forms' ),
							index + 1
						) }
					</strong>
				</FlexItem>
				<FlexItem>
					<Button
						size="small"
						variant="tertiary"
						isDestructive
						onClick={ handleRemove }
						aria-label={ sprintf(
							/* translators: %d: condition number, starting at 1 */
							__( 'Remove condition %d', 'jetpack-forms' ),
							index + 1
						) }
					>
						{ __( 'Remove', 'jetpack-forms' ) }
					</Button>
				</FlexItem>
			</Flex>

			{ missingSubject && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'The referenced field no longer exists. Pick another field or remove this condition.',
						'jetpack-forms'
					) }
				</Notice>
			) }

			<SelectControl
				label={ __( 'Field', 'jetpack-forms' ) }
				value={ rule.field || '' }
				onChange={ handleFieldChange }
				__nextHasNoMarginBottom={ true }
				__next40pxDefaultSize={ true }
			>
				<option value="">{ __( 'Select a field…', 'jetpack-forms' ) }</option>
				{ Object.keys( grouped ).map( group => (
					<optgroup key={ group } label={ group }>
						{ grouped[ group ].map( field => (
							<option key={ field.id } value={ field.id }>
								{ field.label }
							</option>
						) ) }
					</optgroup>
				) ) }
			</SelectControl>

			<SelectControl
				label={ __( 'Operator', 'jetpack-forms' ) }
				value={ rule.operator }
				options={ operators.map( operator => ( {
					value: operator,
					label: getOperatorLabel( operator ),
				} ) ) }
				onChange={ handleOperatorChange }
				__nextHasNoMarginBottom={ true }
				__next40pxDefaultSize={ true }
			/>

			<RuleValueControl rule={ rule } subject={ subject } onChange={ handleValueChange } />
		</BaseControl>
	);
};

/**
 * The Field Value control: a list of conditions comparing sibling fields.
 *
 * @param {object}   props          - Component props.
 * @param {object}   props.value    - This control's stored config, `{ rules }`.
 * @param {Function} props.onChange - Called with the control's next config.
 * @param {Array}    props.fields   - Available subject fields.
 * @return {object} The rendered control.
 */
const FieldValueControl = ( { value, onChange, fields } ) => {
	const rules = useMemo( () => ( Array.isArray( value?.rules ) ? value.rules : [] ), [ value ] );

	const updateRule = useCallback(
		( index, patch ) => {
			onChange( {
				...value,
				rules: rules.map( ( rule, i ) => ( i === index ? { ...rule, ...patch } : rule ) ),
			} );
		},
		[ onChange, rules, value ]
	);

	const removeRule = useCallback(
		index => {
			onChange( { ...value, rules: rules.filter( ( _, i ) => i !== index ) } );
		},
		[ onChange, rules, value ]
	);

	const addRule = useCallback( () => {
		const first = fields[ 0 ];
		onChange( {
			...value,
			rules: [
				...rules,
				{
					field: first?.id || '',
					operator: defaultOperatorFor( first?.typeKey ),
					value: '',
				},
			],
		} );
	}, [ fields, onChange, rules, value ] );

	if ( ! fields.length ) {
		return (
			<Notice status="warning" isDismissible={ false }>
				{ __( 'Add another field to this form to use as a condition.', 'jetpack-forms' ) }
			</Notice>
		);
	}

	return (
		<div className="jetpack-contact-form__conditional-logic-control">
			{ rules.map( ( rule, index ) => (
				<RuleRow
					key={ index }
					rule={ rule }
					index={ index }
					fields={ fields }
					onChange={ updateRule }
					onRemove={ removeRule }
				/>
			) ) }

			<Button variant="secondary" onClick={ addRule }>
				{ __( 'Add condition', 'jetpack-forms' ) }
			</Button>
		</div>
	);
};

export default FieldValueControl;
