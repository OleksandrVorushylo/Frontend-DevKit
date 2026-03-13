chrome.devtools.panels.elements.createSidebarPane("Frontend Tools", function(sidebar) {
  // We can create a sidebar or a full panel. Sidebar in Elements is better for selecting nodes.
  sidebar.setPage("devtools/panel.html");
});
