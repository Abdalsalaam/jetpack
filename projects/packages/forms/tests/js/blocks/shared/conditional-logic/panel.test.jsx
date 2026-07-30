import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const SUBJECT_FIELDS = [
	{ id: 'name_1', label: 'Name', typeKey: 'string', options: [], step: null },
	{ id: 'budget_1', label: 'Budget', typeKey: 'number', options: [], step: null },
	{
		id: 'size_1',
		label: 'Size',
		typeKey: 'choice',
		options: [
			{ value: 'Small', label: 'Small' },
			{ value: 'Large', label: 'Large' },
		],
		step: null,
	},
	{ id: 'terms_1', label: 'Terms', typeKey: 'boolean', options: [], step: null },
];

await jest.unstable_mockModule( '@wordpress/block-editor', () => ( {
	InspectorControls: ( { children } ) => <div>{ children }</div>,
} ) );

await jest.unstable_mockModule(
	'../../../../../src/blocks/shared/conditional-logic/hooks/use-subject-fields.js',
	() => ( {
		__esModule: true,
		default: () => SUBJECT_FIELDS,
	} )
);

const { default: ConditionalLogicPanel } = await import(
	'../../../../../src/blocks/shared/conditional-logic/components/panel.jsx'
);

const DEFAULT_ATTRIBUTE = {
	enabled: false,
	action: 'show',
	logicalOperator: 'any',
	controls: {},
};

const withRules = ( rules, extra = {} ) => ( {
	enabled: true,
	action: 'show',
	logicalOperator: 'all',
	controls: { fieldValue: { rules } },
	...extra,
} );

const setup = async ( conditionalLogic = DEFAULT_ATTRIBUTE ) => {
	const setAttributes = jest.fn();
	const { container } = render(
		<ConditionalLogicPanel
			clientId="abc"
			attributes={ { conditionalLogic } }
			setAttributes={ setAttributes }
		/>
	);

	// PanelBody renders collapsed (initialOpen={false}), so nothing inside it exists
	// in the DOM until the title is activated.
	await userEvent.click( screen.getByRole( 'button', { name: 'Conditional logic' } ) );

	return { setAttributes, container };
};

const optionValues = select =>
	within( select )
		.getAllByRole( 'option' )
		.map( o => o.value );

const openMenu = async () => {
	await userEvent.click( screen.getByRole( 'button', { name: /add condition type/i } ) );
};

describe( 'ConditionalLogicPanel', () => {
	it( 'renders the panel title', async () => {
		await setup();
		expect( screen.getByText( 'Conditional logic' ) ).toBeInTheDocument();
	} );

	it( 'offers Field Value plus the utilities in the add-control menu', async () => {
		await setup();
		await openMenu();

		expect( screen.getByRole( 'menuitem', { name: 'Field Value' } ) ).toBeInTheDocument();
		expect( screen.getByText( 'Copy' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Paste' ) ).toBeInTheDocument();
		expect( screen.getByText( 'Reset all' ) ).toBeInTheDocument();
	} );

	it( 'does not offer an Import action', async () => {
		await setup();
		await openMenu();
		expect( screen.queryByText( 'Import' ) ).not.toBeInTheDocument();
	} );

	it( 'activates the fieldValue control and enables logic', async () => {
		const { setAttributes } = await setup();
		await openMenu();
		await userEvent.click( screen.getByRole( 'menuitem', { name: 'Field Value' } ) );

		expect( setAttributes ).toHaveBeenCalledWith( {
			conditionalLogic: expect.objectContaining( {
				enabled: true,
				controls: { fieldValue: { rules: [] } },
			} ),
		} );
	} );

	it( 'disables logic again when the last control is switched off', async () => {
		const { setAttributes } = await setup( withRules( [] ) );
		await openMenu();
		await userEvent.click( screen.getByRole( 'menuitem', { name: 'Field Value' } ) );

		expect( setAttributes ).toHaveBeenCalledWith( {
			conditionalLogic: expect.objectContaining( { enabled: false, controls: {} } ),
		} );
	} );

	it( 'resets everything back to the default', async () => {
		const { setAttributes } = await setup(
			withRules( [ { field: 'name_1', operator: 'is', value: 'x' } ], { action: 'hide' } )
		);
		await openMenu();
		await userEvent.click( screen.getByText( 'Reset all' ) );

		expect( setAttributes ).toHaveBeenCalledWith( {
			conditionalLogic: {
				enabled: false,
				action: 'show',
				logicalOperator: 'any',
				controls: {},
			},
		} );
	} );

	it( 'hides the action and match selectors until a control is active', async () => {
		await setup();
		expect( screen.queryByLabelText( 'Action' ) ).not.toBeInTheDocument();
	} );

	it( 'shows the action and match selectors once a control is active', async () => {
		await setup( withRules( [] ) );
		expect( screen.getByLabelText( 'Action' ) ).toBeInTheDocument();
		expect( screen.getByLabelText( 'Match type' ) ).toBeInTheDocument();
	} );

	it( 'offers the operators belonging to the subject field type', async () => {
		await setup( withRules( [ { field: 'budget_1', operator: 'greater_than', value: '10' } ] ) );

		const operator = screen.getByLabelText( 'Operator' );
		const values = optionValues( operator );

		expect( values ).toEqual( [
			'equals',
			'not_equals',
			'greater_than',
			'less_than',
			'gte',
			'lte',
			'is_empty',
			'is_not_empty',
		] );
	} );

	it( 'offers string operators for a text subject field', async () => {
		await setup( withRules( [ { field: 'name_1', operator: 'is', value: 'x' } ] ) );

		const operator = screen.getByLabelText( 'Operator' );
		const values = optionValues( operator );

		expect( values ).toEqual( [
			'is',
			'is_not',
			'contains',
			'does_not_contain',
			'is_empty',
			'is_not_empty',
		] );
	} );

	it( 'renders the value as a dropdown of the subject field own options', async () => {
		await setup( withRules( [ { field: 'size_1', operator: 'is', value: 'Small' } ] ) );

		const value = screen.getByLabelText( 'Value' );
		const options = optionValues( value );

		expect( options ).toEqual( [ '', 'Small', 'Large' ] );
	} );

	it( 'renders a number input for a numeric subject field', async () => {
		await setup( withRules( [ { field: 'budget_1', operator: 'greater_than', value: '10' } ] ) );
		expect( screen.getByLabelText( 'Value' ) ).toHaveAttribute( 'type', 'number' );
	} );

	it( 'renders no value input for operators that take no operand', async () => {
		await setup( withRules( [ { field: 'name_1', operator: 'is_empty' } ] ) );
		expect( screen.queryByLabelText( 'Value' ) ).not.toBeInTheDocument();
	} );

	it( 'renders no value input for a boolean subject field', async () => {
		await setup( withRules( [ { field: 'terms_1', operator: 'is_checked' } ] ) );
		expect( screen.queryByLabelText( 'Value' ) ).not.toBeInTheDocument();
	} );

	it( 'lists every sibling field as a possible subject', async () => {
		await setup( withRules( [ { field: 'name_1', operator: 'is', value: 'x' } ] ) );

		const field = screen.getByLabelText( 'Field' );
		const values = optionValues( field );

		expect( values ).toEqual( [ '', 'name_1', 'budget_1', 'size_1', 'terms_1' ] );
	} );

	it( 'warns when a rule references a field that no longer exists', async () => {
		// Scoped to the rendered container: Notice mirrors its text into an aria-live region
		// that WordPress appends to document.body, which would match twice.
		const { container } = await setup(
			withRules( [ { field: 'deleted_1', operator: 'is', value: 'x' } ] )
		);
		expect( within( container ).getByText( /no longer exists/i ) ).toBeInTheDocument();
	} );

	it( 'adds a condition seeded with the first field and a valid operator', async () => {
		const { setAttributes } = await setup( withRules( [] ) );
		await userEvent.click( screen.getByRole( 'button', { name: 'Add condition' } ) );

		expect( setAttributes ).toHaveBeenCalledWith( {
			conditionalLogic: expect.objectContaining( {
				controls: {
					fieldValue: { rules: [ { field: 'name_1', operator: 'is', value: '' } ] },
				},
			} ),
		} );
	} );

	it( 'removes a condition', async () => {
		const { setAttributes } = await setup(
			withRules( [
				{ field: 'name_1', operator: 'is', value: 'x' },
				{ field: 'budget_1', operator: 'gte', value: '5' },
			] )
		);

		await userEvent.click( screen.getByRole( 'button', { name: 'Remove condition 1' } ) );

		expect( setAttributes ).toHaveBeenCalledWith( {
			conditionalLogic: expect.objectContaining( {
				controls: {
					fieldValue: { rules: [ { field: 'budget_1', operator: 'gte', value: '5' } ] },
				},
			} ),
		} );
	} );
} );
