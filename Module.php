<?php
namespace AccessibilityPlus;

use Omeka\Module\AbstractModule;
use Laminas\EventManager\SharedEventManagerInterface;
use Laminas\EventManager\Event;
use Laminas\ServiceManager\ServiceLocatorInterface;

class Module extends AbstractModule
{
    /**
     * Site settings (Site Settings > Accessibility Plus Options).
     */
    const SETTINGS = [
        'accessibility_plus_text',
        'accessibility_plus_contrast',
        'accessibility_plus_links',
        'accessibility_plus_dyslexia',
        'accessibility_plus_spacing',
        'accessibility_plus_motion',
        'accessibility_plus_cursor',
        'accessibility_plus_position',
    ];

    public function getConfig()
    {
        return include __DIR__ . '/config/module.config.php';
    }

    /**
     * Remove the module's site settings from every site.
     */
    public function uninstall(ServiceLocatorInterface $services)
    {
        $siteSettings = $services->get('Omeka\Settings\Site');
        $siteIds = $services->get('Omeka\Connection')->fetchFirstColumn('SELECT id FROM site');
        foreach (self::SETTINGS as $name) {
            foreach ($siteIds as $siteId) {
                $siteSettings->delete($name, $siteId);
            }
        }
    }

    public function attachListeners(SharedEventManagerInterface $sharedEventManager)
    {
        // 1. Attach site settings form handler
        $sharedEventManager->attach(
            'Omeka\Form\SiteSettingsForm',
            'form.add_elements',
            [$this, 'addSiteSettings']
        );

        // 2. Use a wildcard target (*) to inject assets on ALL public site pages globally
        $sharedEventManager->attach(
            '*',
            'view.layout',
            [$this, 'handlePublicLayout']
        );
    }

    public function addSiteSettings(Event $event)
    {
        $services = $this->getServiceLocator();
        $siteSettings = $services->get('Omeka\Settings\Site');
        $form = $event->getTarget();

        // Register the element group so it appears in the site settings page
        $groups = $form->getOption('element_groups');
        $groups['accessibility_plus'] = 'Accessibility Plus Options'; // @translate
        $form->setOption('element_groups', $groups);

        // Add settings elements mapped to the new group
        $form->add([
            'type' => 'checkbox',
            'name' => 'accessibility_plus_text',
            'options' => [
                'element_group' => 'accessibility_plus',
                'label' => 'Enable Text Scaling', // @translate
                'info' => 'Allow users to scale UI text size.', // @translate
            ],
            'attributes' => [
                'value' => $siteSettings->get('accessibility_plus_text', true),
            ],
        ]);

        $form->add([
            'type' => 'checkbox',
            'name' => 'accessibility_plus_contrast',
            'options' => [
                'element_group' => 'accessibility_plus',
                'label' => 'Enable Contrast Modes', // @translate
                'info' => 'Allow users to toggle high contrast, invert, or grayscale.', // @translate
            ],
            'attributes' => [
                'value' => $siteSettings->get('accessibility_plus_contrast', true),
            ],
        ]);

        $form->add([
            'type' => 'checkbox',
            'name' => 'accessibility_plus_links',
            'options' => [
                'element_group' => 'accessibility_plus',
                'label' => 'Enable Link Highlighting', // @translate
                'info' => 'Allow users to highlight clickable links.', // @translate
            ],
            'attributes' => [
                'value' => $siteSettings->get('accessibility_plus_links', true),
            ],
        ]);

        $form->add([
            'type' => 'checkbox',
            'name' => 'accessibility_plus_dyslexia',
            'options' => [
                'element_group' => 'accessibility_plus',
                'label' => 'Enable Font Options', // @translate
                'info' => 'Allow users to switch to a readable (Atkinson Hyperlegible) or dyslexia (OpenDyslexic) font.', // @translate
            ],
            'attributes' => [
                'value' => $siteSettings->get('accessibility_plus_dyslexia', true),
            ],
        ]);

        $form->add([
            'type' => 'checkbox',
            'name' => 'accessibility_plus_spacing',
            'options' => [
                'element_group' => 'accessibility_plus',
                'label' => 'Enable Text Spacing', // @translate
                'info' => 'Allow users to widen line, letter and word spacing (WCAG 1.4.12 values).', // @translate
            ],
            'attributes' => [
                'value' => $siteSettings->get('accessibility_plus_spacing', true),
            ],
        ]);

        $form->add([
            'type' => 'checkbox',
            'name' => 'accessibility_plus_motion',
            'options' => [
                'element_group' => 'accessibility_plus',
                'label' => 'Enable Stop Motion', // @translate
                'info' => 'Allow users to stop animations, transitions and other moving content.', // @translate
            ],
            'attributes' => [
                'value' => $siteSettings->get('accessibility_plus_motion', true),
            ],
        ]);

        $form->add([
            'type' => 'checkbox',
            'name' => 'accessibility_plus_cursor',
            'options' => [
                'element_group' => 'accessibility_plus',
                'label' => 'Enable Big Cursor', // @translate
                'info' => 'Allow users to enlarge the mouse pointer (hidden on touch screens).', // @translate
            ],
            'attributes' => [
                'value' => $siteSettings->get('accessibility_plus_cursor', true),
            ],
        ]);

        $form->add([
            'type' => 'select',
            'name' => 'accessibility_plus_position',
            'options' => [
                'element_group' => 'accessibility_plus',
                'label' => 'Default Widget Position', // @translate
                'info' => 'Select default corner location for the accessibility button.', // @translate
                'value_options' => [
                    'bottom-right' => 'Bottom Right', // @translate
                    'bottom-left' => 'Bottom Left', // @translate
                ],
            ],
            'attributes' => [
                'value' => $siteSettings->get('accessibility_plus_position', 'bottom-right'),
            ],
        ]);
    }

    public function handlePublicLayout(Event $event)
    {
        $view = $event->getTarget();
        
        // Ensure we have a site context
        if (!$view->site) {
            return;
        }

        $services = $this->getServiceLocator();

        // --- THE FIX: Explicitly exclude ALL admin and site-admin routes ---
        $mvcEvent = $services->get('Application')->getMvcEvent();
        if ($mvcEvent) {
            $routeMatch = $mvcEvent->getRouteMatch();
            if ($routeMatch && strpos($routeMatch->getMatchedRouteName(), 'admin') === 0) {
                return; // Abort injection: we are in the admin dashboard
            }
        }
        // --------------------------------------------------------------------

        $siteSettings = $services->get('Omeka\Settings\Site');

        // Read configuration values safely via the site settings service
        $enableText = (bool) $siteSettings->get('accessibility_plus_text', true);
        $enableContrast = (bool) $siteSettings->get('accessibility_plus_contrast', true);
        $enableLinks = (bool) $siteSettings->get('accessibility_plus_links', true);
        $enableDyslexia = (bool) $siteSettings->get('accessibility_plus_dyslexia', true);
        $enableSpacing = (bool) $siteSettings->get('accessibility_plus_spacing', true);
        $enableMotion = (bool) $siteSettings->get('accessibility_plus_motion', true);
        $enableCursor = (bool) $siteSettings->get('accessibility_plus_cursor', true);
        $fabPosition = $siteSettings->get('accessibility_plus_position', 'bottom-right');

        // If all features are unchecked, completely skip rendering the widget/FAB
        if (!$enableText && !$enableContrast && !$enableLinks && !$enableDyslexia
            && !$enableSpacing && !$enableMotion && !$enableCursor) {
            return;
        }

        // Inject configuration variables and assets into the public layout head
        $configJson = json_encode([
            'enableText' => $enableText,
            'enableContrast' => $enableContrast,
            'enableLinks' => $enableLinks,
            'enableDyslexia' => $enableDyslexia,
            'enableSpacing' => $enableSpacing,
            'enableMotion' => $enableMotion,
            'enableCursor' => $enableCursor,
            'fabPosition' => $fabPosition,
            'strings' => $this->panelStrings($view),
        ]);

        $view->headScript()->appendScript("window.AccessibilityPlusConfig = {$configJson};");
        $view->headLink()->appendStylesheet($view->assetUrl('css/access-plus.css', 'AccessibilityPlus'));
        // Loaded in <head> (not deferred) so saved settings apply before the page is drawn
        $view->headScript()->appendFile($view->assetUrl('js/access-plus.js', 'AccessibilityPlus'));
    }

    /**
     * Text of the widget, translated, for access-plus.js. %1$s is filled in by the script.
     */
    protected function panelStrings($view): array
    {
        $translate = $view->plugin('translate');
        return [
            // Button and panel
            'fabLabel' => $translate('Accessibility Options'),
            'panelLabel' => $translate('Accessibility Settings Panel'),
            'title' => $translate('Accessibility'),
            'moveLeft' => $translate('Move widget to left'),
            'moveRight' => $translate('Move widget to right'),
            'closePanel' => $translate('Close Panel'),
            'textSize' => $translate('Text Size'),
            'decreaseText' => $translate('Decrease text size'),
            'increaseText' => $translate('Increase text size'),
            'contrast' => $translate('Contrast'),
            'links' => $translate('Links'),
            'linksLabel' => $translate('Highlight all clickable links'),
            'font' => $translate('Font'),
            'spacing' => $translate('Spacing'),
            'spacingLabel' => $translate('Wider text spacing'),
            'motion' => $translate('Stop Motion'),
            'motionLabel' => $translate('Stop animations and moving content'),
            'cursor' => $translate('Big Cursor'),
            'cursorLabel' => $translate('Large mouse pointer'),
            'reset' => $translate('Reset'),
            'resetLabel' => $translate('Reset all tools to default'),
            'close' => $translate('Close'),
            'closeLabel' => $translate('Close Accessibility Panel'),
            // Setting states shown on the buttons
            'on' => $translate('On'),
            'off' => $translate('Off'),
            'contrastHigh' => $translate('High'),
            'contrastInvert' => $translate('Invert'),
            'contrastGray' => $translate('Gray'),
            'fontDefault' => $translate('Default'),
            'fontReadable' => $translate('Readable'),
            'fontDyslexic' => $translate('Dyslexic'),
            // %1$s = the current setting, e.g. "High"
            'contrastState' => $translate('Contrast: %1$s (click to change)'),
            'fontState' => $translate('Font: %1$s (click to change)'),
            // Announcements for screen readers
            'menuOpened' => $translate('Accessibility menu opened'),
            'menuClosed' => $translate('Accessibility menu closed'),
            'resetDone' => $translate('All accessibility settings reset to default'),
            'movedLeft' => $translate('Widget moved to the left'),
            'movedRight' => $translate('Widget moved to the right'),
            // %1$s = the new text size, e.g. 120
            'textIncreased' => $translate('Text size increased to %1$s percent'),
            'textDecreased' => $translate('Text size decreased to %1$s percent'),
            'contrastModeOff' => $translate('Contrast mode off'),
            // %1$s = the contrast mode, e.g. "High"
            'contrastMode' => $translate('Contrast mode: %1$s'),
            'fontRestored' => $translate('Default font restored'),
            // %1$s = the font, e.g. "Readable"
            'fontEnabled' => $translate('%1$s font enabled'),
            'linksOn' => $translate('Link highlighting enabled'),
            'linksOff' => $translate('Link highlighting disabled'),
            'spacingOn' => $translate('Wider text spacing enabled'),
            'spacingOff' => $translate('Wider text spacing disabled'),
            'motionOn' => $translate('Stop animations enabled'),
            'motionOff' => $translate('Stop animations disabled'),
            'cursorOn' => $translate('Large cursor enabled'),
            'cursorOff' => $translate('Large cursor disabled'),
        ];
    }
}