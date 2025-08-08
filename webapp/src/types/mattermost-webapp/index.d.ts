declare module '@mattermost/types/store' {
    export interface GlobalState {
        entities: {
            channels: {
                currentChannelId: string;
            };
            teams: {
                currentTeamId: string;
            };
        };
    }
}

export interface PluginRegistry {
    registerRightHandSidebarComponent(component: React.ComponentType<any>, title: string): {
        showRHSPlugin: () => void;
        hideRHSPlugin: () => void;
    };
    
    registerChannelHeaderButtonAction(
        icon: React.ReactElement,
        action: () => void,
        tooltipText: string,
        description: string
    ): void;
}
