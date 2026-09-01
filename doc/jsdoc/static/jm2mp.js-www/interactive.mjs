/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file ESM Module for Interactive Example of Using JM2MP.JS in WWW.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

"use strict";
import * as JM2MP from 'https://cdn.jsdelivr.net/npm/@json-mde/jm2mp@1.0.0/+esm';

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

var source_editor = null;
var projection_editor = null;
var resultant_editor = null;

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @description
 * It shows an `alert` dialog about the specified `error`.
 * @param {Error} error
 * The `error` to show.
 * @param {string} [site]
 * The site where the error is detected.
 * @param {boolean} [just_alert=false] 
 * When `true`, then the message text is written to the `result_editor`;
 * when `false`, an `alert` is shown.
**/
function ShowError (error, site="", just_alert=false)
{
    if(error instanceof Error)
    {
        const at = (site ? `at ${site}`:'');
        const message =`ERROR ${at}!\r\n${error.name} ${error.message}\r\n\r\n${error}`;
        if ( (!just_alert) && resultant_editor ) { resultant_editor.session.setValue(message); }
        else { alert(message); }
    }
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It injects the "on click" event listener to the "Load C+S Example"
 * action button, using unobtrusive JavaScript technique.
 * @param {string} id_button_for_load_example
 * The HtmlElement.ID where inject such event listener.
 * @returns {boolean}
 * Always `false`, t avoid any kind of navigation from just pressing
 * such button.
**/
function InjectFunction_LoadCoursesAndStudentsExample( id_button_for_load_example )
{
    //// alert( "Injecting projection event handler: " + id_button_for_projection + ".onclick" );
    const button_for_load_example = document.getElementById( id_button_for_load_example );
    if ( button_for_load_example )
    {
       button_for_load_example.addEventListener(
          'click',
          async function SourceDocument_LoadCoursesAndStudentsExample__OnClick(event)
          {
            /* */
            event.preventDefault();
            /* */
            if ( source_editor )
            {
                try
                {
                    const example_source_file = await import("../examples/courses-students/source.json", { with: { type: "json" } });
                    const example_source_content = JSON.stringify(example_source_file.default,undefined,2);
                    source_editor.session.setValue(example_source_content);
                }
                catch (error)
                {
                    ShowError(error, 'LoadCoursesAndStudentsExample/source');
                }
            }
            /* */
            if ( projection_editor )
            {
                try
                {
                    const example_projection_file = await import("../examples/courses-students/projection.json", { with: { type: "json" } });
                    const example_projection_content = JSON.stringify(example_projection_file.default,undefined,2);
                    projection_editor.session.setValue(example_projection_content);
                }
                catch (error)
                {
                    ShowError(error, 'LoadCoursesAndStudentsExample/projection');
                }
            }
            /* */
            if ( resultant_editor )
            {
                resultant_editor.session.setValue("");
            }
            /* It avoids any kind of navigation from just pressing this button. */
            return false;
          }
       );
    }
};


/* ------------------------------------------------------------------ */

/**
 * @description
 * It injects the "on click" event listener to the "Load IM Example"
 * action button, using unobtrusive JavaScript technique.
 * @param {string} id_button_for_load_example
 * The HtmlElement.ID where inject such event listener.
 * @returns {boolean}
 * Always `false`, t avoid any kind of navigation from just pressing
 * such button.
**/
function InjectFunction_LoadInventoryExample( id_button_for_load_example )
{
    //// alert( "Injecting projection event handler: " + id_button_for_projection + ".onclick" );
    let button_for_load_example = document.getElementById( id_button_for_load_example );
    if ( button_for_load_example )
    {
       button_for_load_example.addEventListener(
          'click',
          async function SourceDocument_LoadInventoryExample__OnClick(event)
          {
            /* */
            event.preventDefault();
            /* */
            if ( source_editor )
            {
                try
                {
                    const example_source_file = await import("../examples/inventory/source.json", { with: { type: "json" } });
                    const example_source_content = JSON.stringify(example_source_file.default,undefined,2);
                    source_editor.session.setValue(example_source_content);
                }
                catch (error)
                {
                    ShowError(error, 'LoadInventoryExample/source');
                }
            }
            /* */
            if ( projection_editor )
            {
                try
                {
                    const example_projection_file = await import("../examples/inventory/projection.json", { with: { type: "json" } });
                    const example_projection_content = JSON.stringify(example_projection_file.default,undefined,2);
                    projection_editor.session.setValue(example_projection_content);
                }
                catch (error)
                {
                    ShowError(error, 'LoadInventoryExample/projection');
                }
            }
            /* */
            if ( resultant_editor )
            {
                resultant_editor.session.setValue("");
            }
            /* It avoids any kind of navigation from just pressing this button. */
            return false;
          }
       );
    }
};


/* ------------------------------------------------------------------ */


/**
 * @description
 * It injects the "on click" event listener to the
 * "Load Gregory-Liebniz (Pi) Example" action button,
 * using unobtrusive JavaScript technique.
 * @param {string} id_button_for_load_example
 * The HtmlElement.ID where inject such event listener.
 * @returns {boolean}
 * Always `false`, t avoid any kind of navigation from just pressing
 * such button.
**/
function InjectFunction_LoadGregoryLiebnizPiExample( id_button_for_load_example )
{
    //// alert( "Injecting projection event handler: " + id_button_for_projection + ".onclick" );
    let button_for_load_example = document.getElementById( id_button_for_load_example );
    if ( button_for_load_example )
    {
       button_for_load_example.addEventListener(
          'click',
          async function SourceDocument_LoadInventoryExample__OnClick(event)
          {
            /* */
            event.preventDefault();
            /* */
            if ( source_editor )
            {
                try
                {
                    const example_source_file = await import("../examples/Gregory-Liebniz--Pi/source.json", { with: { type: "json" } });
                    const example_source_content = JSON.stringify(example_source_file.default,undefined,2);
                    source_editor.session.setValue(example_source_content);
                }
                catch (error)
                {
                    ShowError(error, 'LoadGregoryLiebnizPiExample/source');
                }
            }
            /* */
            if ( projection_editor )
            {
                try
                {
                    const example_projection_file = await import("../examples/Gregory-Liebniz--Pi/projection.json", { with: { type: "json" } });
                    const example_projection_content = JSON.stringify(example_projection_file.default,undefined,2);
                    projection_editor.session.setValue(example_projection_content);
                }
                catch (error)
                {
                    ShowError(error, 'LoadGregoryLiebnizPiExample/projection');
                }
            }
            /* */
            if ( resultant_editor )
            {
                resultant_editor.session.setValue("");
            }
            /* It avoids any kind of navigation from just pressing this button. */
            return false;
          }
       );
    }
};


/* ------------------------------------------------------------------ */


/**
 * @description
 * It injects the "on click" event listener to the "Validate" action
 * button, using unobtrusive JavaScript technique.
**/
function InjectValidationFunction(id_button_for_validation)
{
    //// alert( "Injecting validation event handler: " + id_button_for_validation + ".onclick" );
    let button_for_validation = document.getElementById( id_button_for_validation );
    if ( button_for_validation )
    {
        button_for_validation.addEventListener('click', async function ProjectionDocument_Validate__OnClick(event) {
            /* */
            event.preventDefault();
            /* */
            let source_document_object_model = null;
            let projection_object_model = null;
            /* */
            if ( source_editor )
            {
                try
                {
                    const source_document_json_text = source_editor.session.getValue();
                    source_document_object_model = JSON.parse( source_document_json_text );
                }
                catch
                {
                    ShowError(error, 'Validate/source');
                }
            }
            /* */
            if ( projection_editor )
            {
                try
                {
                    const projection_json_text = projection_editor.session.getValue();
                    projection_object_model = JSON.parse( projection_json_text );
                }
                catch
                {
                    ShowError(error, 'Validate/projection');
                }
            }
            /* */
            if ( resultant_editor && source_document_object_model && projection_object_model )
            {
                try
                {
                    //
                    const rootName = "projection";
                    const loader = await JM2MP.createStringLoader(
                        { "projection" : JSON.stringify(projection_object_model) }
                    );
                    // When no registry is specified, a native-only wull be created.
                    const actualRegistry = await JM2MP.createAdapterRegistry();
                    // Stage 1/3: resolve and normalize modules.
                    const resolvedModule = await JM2MP.resolve(rootName, loader, {maxModules:1000,});
                    // Stage 2/3: validate the final module.
                    await JM2MP.validateModule(resolvedModule, actualRegistry);
                    resultant_editor.session.setValue("OK... projection is valid!");
                }
                catch ( error )
                {
                    ShowError(error, 'Validate/resultant');
                }
            }
            /* It avoids any kind of navigation from just pressing this button. */
            return false;
        });
    }
};


/* ------------------------------------------------------------------ */


/**
 * @constant {Function}
 * It injects the "on click" event listener to the "Project" action
 * button, using unobtrusive JavaScript technique.
**/
function InjectProjectionFunction( id_button_for_projection )
{
    //// alert( "Injecting projection event handler: " + id_button_for_projection + ".onclick" );
    let button_for_projection = document.getElementById( id_button_for_projection );
    if ( button_for_projection )
    {
        button_for_projection.addEventListener('click', async function ProjectionDocument_Project__OnClick(event) {
            /* */
            event.preventDefault();
            /* */
            let source_document_object_model = null;
            let projection_object_model = null;
            /* */
            if ( source_editor )
            {
                try
                {
                    const source_document_json_text = source_editor.session.getValue();
                    source_document_object_model = JSON.parse( source_document_json_text );
                }
                catch
                {
                    ShowError(error, 'Project/source');
                }
            }
            /* */
            if ( projection_editor )
            {
                try
                {
                    const projection_json_text = projection_editor.session.getValue();
                    projection_object_model = JSON.parse( projection_json_text );
                }
                catch
                {
                    ShowError(error, 'Project/projection');
                }
            }
            /* */
            if ( resultant_editor && source_document_object_model && projection_object_model )
            {
                try
                {
                    const string_loader = await JM2MP.createStringLoader(
                        { "projection" : JSON.stringify(projection_object_model) }
                    );
                    const result_document_object_model = await JM2MP.project({
                            rootName: "projection",
                            loader: string_loader,
                            document: source_document_object_model,
                            registry: undefined,
                            options: {}
                    });
                    const result_document_json_text = JSON.stringify( result_document_object_model, undefined, 2 );
                    resultant_editor.session.setValue( result_document_json_text );
                }
                catch ( error )
                {
                    ShowError(error, 'Project/resultant');
                }
            }
            /* It avoids any kind of navigation from just pressing this button. */
            return false;
        });
    }
};


/* ------------------------------------------------------------------ */


/**
 * @constant {Function}
 * It injects the "on click" event listener to the "Project" action
 * button, using unobtrusive JavaScript technique.
**/
function InjectCopyToClipboardFunction( id_button_for_projection )
{
    //// alert( "Injecting projection event handler: " + id_button_for_projection + ".onclick" );
    const button_for_projection = document.getElementById( id_button_for_projection );
    if ( button_for_projection )
    {
        button_for_projection.addEventListener(
            'click',
            async function ResultantDocument_CopyToClipboard__OnClick(event)
            {
                /* */
                event.preventDefault();
                /* */
                if ( resultant_editor )
                {
                    try
                    {
                        const resultant_text = resultant_editor.session.getValue();
                        await navigator.clipboard.writeText(resultant_text);
                    }
                    catch ( error )
                    {
                        ShowError(error, 'Resultant/copy-to-clipboard');
                    }
                }
                /* It avoids any kind of navigation from just pressing this button. */
                return false;
            }
        );
    }
};


/* ------------------------------------------------------------------ */

/**
 * @description
 * Ace Cloud9 initialization.
 * @param {string} id_source_editor
 * The HtmlElement.ID of the _source document_ `Ace9` editor.
 * @param {string} id_projection_editor
 * The...
 * @param {string} id_resultant_editor
 * The...
 * @returns {boolean}
 * Always `false` to prevent default action (avoids navigation).
**/
function AceCloud9_Initialization( id_source_editor, id_projection_editor, id_resultant_editor )
{
    /* Source. */
    source_editor = ace.edit( id_source_editor );
    if ( source_editor )
    {
        source_editor.setTheme( "ace/theme/sqlserver" );
        source_editor.session.setMode( "ace/mode/json" );
        source_editor.setOptions( { enableBasicAutocompletion: true, enableSnippets: true } );
        source_editor.setShowPrintMargin( true );
        source_editor.setHighlightActiveLine( true );
    }
    /* Projection. */
    projection_editor = ace.edit( id_projection_editor );
    if ( projection_editor )
    {
        projection_editor.setTheme( "ace/theme/sqlserver" );
        projection_editor.session.setMode( "ace/mode/json" );
        projection_editor.setOptions( { enableBasicAutocompletion: true, enableSnippets: true } );
        projection_editor.setShowPrintMargin( true );
        projection_editor.setHighlightActiveLine( true );
    }
    /* Result. */
    resultant_editor = ace.edit( id_resultant_editor );
    if ( resultant_editor )
    {
        resultant_editor.setTheme( "ace/theme/sqlserver" );
        resultant_editor.session.setMode( "ace/mode/json" );
        resultant_editor.setOptions( { enableBasicAutocompletion: true, enableSnippets: true } );
        resultant_editor.setShowPrintMargin( true );
        resultant_editor.setHighlightActiveLine( true );
    }
    /* It avoids any kind of navigation from just pressing this button. */
    return false;
}

/* ------------------------------------------------------------------ */


/***
 * Unobtrusive JavaScript for onLoad page's event.
***/
window.addEventListener('DOMContentLoaded', function() {
    //// alert("window.onload");
    /* */
    InjectFunction_LoadCoursesAndStudentsExample("SourceDocument_LoadCoursesAndStudentsExample");
    InjectFunction_LoadInventoryExample("SourceDocument_LoadInventoryExample");
    InjectFunction_LoadGregoryLiebnizPiExample("SourceDocument_LoadGregoryLiebnizPiExample");
    /* */
    InjectValidationFunction("ProjectionDocument_Validate");
    InjectProjectionFunction("ProjectionDocument_Project");
    /* */
    InjectCopyToClipboardFunction("ResultantDocument_CopyToClipboard");
    /* */
    AceCloud9_Initialization("SourceDocument_ContentText",
                             "ProjectionDocument_ContentText",
                             "ResultantDocument_ContentText");
});


/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: $/JM2MP.JS/index.js */
