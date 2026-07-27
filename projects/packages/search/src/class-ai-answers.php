<?php
/**
 * AI Answers feature — behavior meta and enabled flag.
 *
 * @package automattic/jetpack-search
 */

namespace Automattic\Jetpack\Search;

use Automattic\Jetpack\Modules;
use Automattic\Jetpack\Status\Host;

/**
 * Registers behavior meta on the Gutenberg Guidelines CPT and exposes the
 * jetpack_search_ai_answers_enabled option.
 */
class AI_Answers {
	const BEHAVIOR_META_KEY   = '_guideline_block_jetpack_search-ai-summary';
	const BEHAVIOR_OPTION_KEY = 'jetpack_search_ai_behavior_instructions';
	const AI_MODULE           = 'ai';
	const AI_MASTER_OPTION    = 'jetpack_ai_enabled';

	/**
	 * Hook up meta/setting registration.
	 */
	public function init() {
		add_action( 'rest_api_init', array( $this, 'register_behavior_meta' ) );
	}

	/**
	 * Register the behavior instructions storage for the REST API.
	 *
	 * When the Gutenberg Guidelines CPT is present, registers the block-specific
	 * meta key on it. Otherwise registers a site option exposed via /wp/v2/settings.
	 */
	public function register_behavior_meta() {
		if ( post_type_exists( 'wp_guideline' ) ) {
			register_post_meta(
				'wp_guideline',
				self::BEHAVIOR_META_KEY,
				array(
					'single'            => true,
					'type'              => 'string',
					'show_in_rest'      => true,
					'default'           => '',
					'sanitize_callback' => 'sanitize_textarea_field',
					'auth_callback'     => function () {
						return current_user_can( 'manage_options' );
					},
				)
			);
			return;
		}

		register_setting(
			'options',
			self::BEHAVIOR_OPTION_KEY,
			array(
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_textarea_field',
				'show_in_rest'      => true,
			)
		);
	}

	/**
	 * Retrieve the behavior instructions.
	 *
	 * Reads from the Gutenberg Guidelines CPT when available, otherwise falls
	 * back to the site option.
	 *
	 * @return string Behavior instructions, or empty string if none saved.
	 */
	public static function get_behavior_instructions() {
		if ( post_type_exists( 'wp_guideline' ) ) {
			$posts = get_posts(
				array(
					'post_type'      => 'wp_guideline',
					'posts_per_page' => 1,
					'post_status'    => 'publish',
				)
			);
			if ( ! empty( $posts ) ) {
				$guidelines = get_post_meta( $posts[0]->ID, self::BEHAVIOR_META_KEY, true );
				return is_string( $guidelines ) ? $guidelines : '';
			}
		}
		return (string) get_option( self::BEHAVIOR_OPTION_KEY, '' );
	}

	/**
	 * Whether the site-wide Jetpack AI master switch is on.
	 *
	 * Mirrors `Jetpack_AI_Settings::is_master_enabled()` in the Jetpack plugin,
	 * which is the source of truth: this package ships in standalone plugins and
	 * cannot reference that class. The answer is computed rather than filtered so
	 * no plugin can flip a gate that must hold — the same reasoning as
	 * `Search_Blocks::supports_paid_search()`.
	 *
	 * The master lives in a different place depending on the platform. On
	 * WordPress.com Simple no Jetpack modules run, so the `jetpack_ai_enabled`
	 * option is the master. Everywhere else the `ai` module is, toggled through
	 * the standard Jetpack module machinery.
	 *
	 * @since $$next-version$$
	 *
	 * @return bool True when Jetpack AI is on, or when the site has no master switch.
	 */
	public static function is_master_enabled() {
		if ( ( new Host() )->is_wpcom_simple() ) {
			return (bool) get_option( self::AI_MASTER_OPTION, true );
		}

		$modules = new Modules();

		// Without the Jetpack plugin — a standalone Jetpack Search install — the
		// `ai` module is not registered, so is_active() would report false for a
		// master switch that was never installed. Don't gate those sites.
		if ( ! in_array( self::AI_MODULE, $modules->get_available(), true ) ) {
			return true;
		}

		return $modules->is_active( self::AI_MODULE );
	}

	/**
	 * Keep the AI Answers option from being turned on while the master switch is off.
	 *
	 * Registered as the setting's sanitize_callback, so it covers writes that go
	 * straight to `/wp/v2/settings` — the path the Customberg sidebar uses —
	 * without passing through the Search REST controller.
	 *
	 * Blocking a write is not the same as clearing the setting: `update_option()`
	 * sanitizes before it reads the old value, so returning false here would
	 * overwrite a saved choice rather than leave it alone. The AI feature settings
	 * endpoint writes feature choices while the master is off precisely so they
	 * survive it, so keep the stored value instead. Turning the feature off stays
	 * allowed.
	 *
	 * @since $$next-version$$
	 *
	 * @param mixed $value Incoming setting value.
	 * @return bool
	 */
	public static function sanitize_enabled_setting( $value ) {
		if ( ! $value ) {
			return false;
		}

		if ( ! self::is_master_enabled() ) {
			return self::is_saved_on();
		}

		return true;
	}

	/**
	 * The stored AI Answers choice, ignoring every gate.
	 *
	 * The dashboard shows this while the master switch is off, so a saved choice
	 * isn't misreported back to the user as off.
	 *
	 * @since $$next-version$$
	 *
	 * @return bool
	 */
	public static function is_saved_on() {
		return (bool) get_option( 'jetpack_search_ai_answers_enabled', false );
	}

	/**
	 * Whether AI Answers is enabled for the current site.
	 */
	public static function is_enabled() {
		$enabled = (bool) apply_filters(
			'jetpack_search_ai_answers_enabled',
			(bool) get_option( 'jetpack_search_ai_answers_enabled', false )
		);

		// The master gate is applied after the filter chain so it cannot be
		// filtered back on, matching `Jetpack_AI_Settings::is_ai_enabled()`.
		return $enabled && self::is_master_enabled();
	}
}
