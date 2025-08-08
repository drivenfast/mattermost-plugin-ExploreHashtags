import React from 'react';
import RHS from './Components/RHS';

export default class Plugin {
    private hideRHSPlugin?: () => void;

    public async initialize(registry: any, store: any) {
        try {
            console.log('Hashtags plugin initializing...');

            // Register RHS component first
            const rhsComponent = registry.registerRightHandSidebarComponent(
                RHS,
                'Hashtags'
            );

            if (!rhsComponent || !rhsComponent.showRHSPlugin) {
                throw new Error('Failed to register RHS component');
            }

            // Store references to show/hide functions wrapped in dispatch
            this.hideRHSPlugin = () => store.dispatch(rhsComponent.hideRHSPlugin);
            const showRHSAction = () => store.dispatch(rhsComponent.showRHSPlugin);

            // Register channel header icon with proper action
            registry.registerChannelHeaderButtonAction(
                React.createElement('i', {
                    className: 'icon fa fa-hashtag',
                    style: {fontSize: '15px'},
                }),
                showRHSAction,
                'View Hashtags',
                'Open hashtag browser for this channel'
            );

            console.log('Hashtags plugin initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing hashtags plugin:', error);
            return false;
        }
    }

    public uninitialize() {
        if (this.hideRHSPlugin) {
            this.hideRHSPlugin();
        }
    }
}

declare global {
    interface Window {
        registerPlugin(id: string, plugin: Plugin): void;
    }
}

window.registerPlugin('com.ecf.hashtags', new Plugin());
