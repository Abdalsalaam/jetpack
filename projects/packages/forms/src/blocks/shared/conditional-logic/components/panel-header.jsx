import { DropdownMenu, MenuGroup, MenuItem } from '@wordpress/components';
import { useCallback, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { check, plus } from '@wordpress/icons';
import { DEFAULT_LOGIC } from '../constants.js';
import { CONTROLS } from '../controls/index.js';
import { OPERATORS } from '../util/field-types.ts';

/**
 * Whether this browser lets a page read the clipboard.
 *
 * Firefox does not expose `readText()` to web pages, so Paste is disabled there rather than
 * failing silently when the menu item is clicked.
 *
 * @return {boolean} True when clipboard reads are available.
 */
const canReadClipboard = () =>
	typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';

/**
 * Validate a pasted logic object before it replaces the current one.
 *
 * Rejects anything that would produce rules the evaluators cannot run, so a bad paste
 * surfaces as an error instead of silently disabling a field's conditions.
 *
 * @param {*} parsed - The parsed clipboard payload.
 * @return {boolean} True when the payload is a usable logic object.
 */
const isValidLogic = parsed => {
	if ( ! parsed || typeof parsed !== 'object' || Array.isArray( parsed ) ) {
		return false;
	}
	if ( parsed.controls && typeof parsed.controls !== 'object' ) {
		return false;
	}

	const rules = parsed.controls?.fieldValue?.rules;

	if ( rules === undefined ) {
		return true;
	}

	if ( ! Array.isArray( rules ) ) {
		return false;
	}

	const known = Object.values( OPERATORS );

	return rules.every( rule => rule && typeof rule === 'object' && known.includes( rule.operator ) );
};

/**
 * The panel's "+" menu: switch condition types on and off, then copy, paste, or reset.
 *
 * @param {object}   props          - Component props.
 * @param {object}   props.logic    - The current normalized logic object.
 * @param {Function} props.onChange - Called with the next logic object.
 * @param {Function} props.onError  - Called with an error message, or null to clear it.
 * @return {object} The rendered dropdown.
 */
const ConditionalLogicPanelHeader = ( { logic, onChange, onError } ) => {
	const [ busy, setBusy ] = useState( false );

	const toggleControl = useCallback(
		control => {
			const controls = { ...logic.controls };

			if ( controls[ control.slug ] ) {
				delete controls[ control.slug ];
			} else {
				controls[ control.slug ] = control.defaultValue;
			}

			// Enabling is implicit: a field with no active control has nothing to evaluate, so
			// leaving `enabled` true would only make the evaluators do pointless work.
			onChange( { ...logic, controls, enabled: Object.keys( controls ).length > 0 } );
		},
		[ logic, onChange ]
	);

	const handleCopy = useCallback( async () => {
		onError( null );
		try {
			await navigator.clipboard.writeText( JSON.stringify( logic ) );
		} catch {
			onError( __( 'Could not copy to the clipboard.', 'jetpack-forms' ) );
		}
	}, [ logic, onError ] );

	const handlePaste = useCallback( async () => {
		onError( null );
		setBusy( true );
		try {
			const text = await navigator.clipboard.readText();
			const parsed = JSON.parse( text );

			if ( ! isValidLogic( parsed ) ) {
				onError( __( 'That clipboard content is not valid conditional logic.', 'jetpack-forms' ) );
				return;
			}

			onChange( { ...DEFAULT_LOGIC, ...parsed, controls: { ...( parsed.controls || {} ) } } );
		} catch {
			onError( __( 'That clipboard content is not valid conditional logic.', 'jetpack-forms' ) );
		} finally {
			setBusy( false );
		}
	}, [ onChange, onError ] );

	const handleReset = useCallback( () => {
		onError( null );
		onChange( { ...DEFAULT_LOGIC, controls: {} } );
	}, [ onChange, onError ] );

	const hasEdits = Object.keys( logic.controls ).length > 0;

	return (
		<DropdownMenu
			icon={ plus }
			label={ __( 'Add condition type', 'jetpack-forms' ) }
			className="jetpack-contact-form__conditional-logic-menu"
		>
			{ () => (
				<>
					<MenuGroup label={ __( 'Controls', 'jetpack-forms' ) }>
						{ CONTROLS.map( control => {
							const isActive = !! logic.controls[ control.slug ];
							return (
								<MenuItem
									key={ control.slug }
									icon={ isActive ? check : undefined }
									isSelected={ isActive }
									onClick={ () => toggleControl( control ) }
								>
									{ control.label }
								</MenuItem>
							);
						} ) }
					</MenuGroup>
					<MenuGroup>
						<MenuItem onClick={ handleCopy } disabled={ ! hasEdits }>
							{ __( 'Copy', 'jetpack-forms' ) }
						</MenuItem>
						<MenuItem
							onClick={ handlePaste }
							disabled={ busy || ! canReadClipboard() }
							help={
								canReadClipboard()
									? undefined
									: __( 'Pasting is not supported in this browser.', 'jetpack-forms' )
							}
						>
							{ __( 'Paste', 'jetpack-forms' ) }
						</MenuItem>
						<MenuItem onClick={ handleReset } disabled={ ! hasEdits } isDestructive>
							{ __( 'Reset all', 'jetpack-forms' ) }
						</MenuItem>
					</MenuGroup>
				</>
			) }
		</DropdownMenu>
	);
};

export default ConditionalLogicPanelHeader;
