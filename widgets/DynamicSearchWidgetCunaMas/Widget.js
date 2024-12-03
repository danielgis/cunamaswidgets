import declare from 'dojo/_base/declare';
import BaseWidget from 'jimu/BaseWidget';
import _WidgetsInTemplateMixin from 'dijit/_WidgetsInTemplateMixin';
import WidgetManager from "jimu/WidgetManager"
import QueryTask from "esri/tasks/QueryTask";
import Query from "esri/tasks/query";
import Deferred from "dojo/Deferred";
import all from "dojo/promise/all";
import BusyIndicator from 'esri/dijit/util/busyIndicator';
import Message from "jimu/dijit/Message";
import jquery from 'https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js';
import select2 from 'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.6-rc.0/js/select2.min.js';

const fontAwesome = document.createElement('script');
fontAwesome.src = 'https://use.fontawesome.com/releases/v5.3.1/js/all.js';
document.head.appendChild(fontAwesome);

const select2Css = document.createElement('link');
select2Css.rel = 'stylesheet';
select2Css.href = 'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.6-rc.0/css/select2.min.css';
document.head.appendChild(select2Css);

let isFirstLoad = false;

// To create a widget, you need to derive from BaseWidget.
export default declare([BaseWidget], {

  // Custom widget code goes here

  baseClass: 'dynamic-search-widget-cuna-mas',
  groupSelected: null,
  urlLayerSelected: null,
  whereDefault: '1=1',

  // add additional properties here

  // methods to communication with app container:
  postCreate() {
    this.inherited(arguments);
    this.map.on("update-end", this.executeZoomExtentInitial.bind(this));
  },

  showMessageCs(message, type = 'message') {
    const title = `${this.nls.widgetTitle}`;
    new Message({
      type: type,
      titleLabel: title,
      message: message,
    });
  },

  onClickGroup(evt) {
    const indexGroupSelected = Array.from(evt.target.parentNode.children).indexOf(evt.target);
    this.groupSelected = this.config.groups.find(group => group.index === indexGroupSelected);
    this.buildFormRadioCs();
    this.buildFormSearchCs();
    this.buildHeaderSearchCs();
    this.containerGroupsApCs.classList.toggle('active');
    this.containerFiltersApCs.classList.toggle('active');
  },

  onClickBack(evt) {
    this.containerGroupsApCs.classList.toggle('active');
    this.containerFiltersApCs.classList.toggle('active');
    this.destroyFormSearchCs();
    this.urlLayerSelected = null;
  },

  startup() {
    this.inherited(arguments);
    this.busyIndicator = BusyIndicator.create({
      target: this.domNode.parentNode.parentNode,
      backgroundOpacity: 0
    });
  },
  onOpen() {
    this.buildMainMenuCs();
    dojo.query(".groupFilterClsCs").on('click', this.onClickGroup.bind(this));
    dojo.query(".backButtonClsCs").on('click', this.onClickBack.bind(this));
  },

  executeZoomExtentInitial() {
    if (isFirstLoad) {
      return;
    }
    this.executeHomeExtent();
    // const homeWidget = WidgetManager.getInstance().getWidgetsByName("HomeButton");
    // this.map.setExtent(homeWidget[0].homeDijit.extent);
    isFirstLoad = true;
  },
  executeHomeExtent() {
    const homeWidget = WidgetManager.getInstance().getWidgetsByName("HomeButton");
    this.map.setExtent(homeWidget[0].homeDijit.extent);
  },

  buildMainMenuCs() {
    this.config.groups.sort((a, b) => a.index - b.index);
    this.containerGridApCs.innerHTML = '';
    if (this.config.groups.length == 1) {
      this.groupSelected = this.config.groups[0];
      this.containerBackApCs.classList.remove('active');
      this.buildFormRadioCs();
      this.buildFormSearchCs();
      this.buildHeaderSearchCs();
      this.containerGroupsApCs.classList.toggle('active');
      this.containerFiltersApCs.classList.toggle('active');
      return;
    }
    this.config.groups.forEach(group => {
      const img = document.createElement('img');
      img.src = group.logo;
      img.alt = group.name;
      img.classList.add('groupFilterClsCs', 'groupCs');
      img.setAttribute('data-dojo-attach-point', 'scdApCs');
      this.containerGridApCs.appendChild(img);
    });
  },

  buildHeaderSearchCs() {
    dojo.query('#nameSelectedCs')[0].innerHTML = this.groupSelected.label;
    dojo.query('#nameSelectedCs')[0].style.color = this.groupSelected.color;
    dojo.query('#descSelectedCs')[0].innerHTML = this.groupSelected.description;
    dojo.query('#descSelectedCs')[0].style.color = this.groupSelected.color;
    const img = document.createElement('img');
    img.src = this.groupSelected.logo;
    img.alt = this.groupSelected.name;
    img.classList.add('groupFilterClsCs', 'groupCs');
    img.setAttribute('data-dojo-attach-point', 'scdApCs');
    this.containerImgSelectedApCs.innerHTML = '';
    this.containerImgSelectedApCs.appendChild(img);
  },

  buildFormRadioCs() {
    if (this.groupSelected.layersForm) {
      this.makeSelectorLayers(this.groupSelected.layersForm.layers);
      if (this.groupSelected.layersForm.visible) {
        this.radioContainerApCs.classList.add('active');
      } else {
        this.radioContainerApCs.classList.remove('active');
      }
    } else {
      this.radioContainerApCs.classList.remove('active');
    }
  },

  buildFormSearchCs() {
    this.busyIndicator.show();
    const filters = this.groupSelected.filters;
    filters.sort((a, b) => a.index - b.index);
    this.containerBodyApCs.innerHTML = '';

    const labelReset = document.createElement('p');
    labelReset.classList.add('resetFilterClsCs');
    labelReset.innerHTML = this.nls.restoreLabelCs;
    this.containerBodyApCs.appendChild(labelReset);

    labelReset.addEventListener('click', this.resetAllOpionSelected.bind(this));

    filters.forEach((filter, index) => {
      const label = document.createElement('p');
      label.classList.add('labelComboBoxClsCs');
      label.innerHTML = filter.label;
      this.containerBodyApCs.appendChild(label);

      const select = document.createElement('select');
      select.classList.add('comboBoxClsCs');
      select.classList.add('form-control');
      select.classList.add('js-example-tags');
      // select.classList.add('select2');
      select.id = filter.codeField;
      if (filter.startupData) {
        const urlFilter = this.urlLayerSelected || filter.url;
        const fieldsFilter = [filter.codeField, filter.nameField];
        this.getDataByFilter(urlFilter, fieldsFilter)
          .then(response => {
            if (response.features.length === 1000) {
              // disable select
              $(`#${filter.codeField}`).prop("disabled", true);
            } else {
              $(`#${filter.codeField}`).prop("disabled", false);
              this.makeOptionCs(response.features, select, filter.codeField, filter.nameField, filter.firstOption);
            }
          })
          .catch(err => {
            console.error('err', err);
          });

      };
      this.containerBodyApCs.appendChild(select);
      $(`#${filter.codeField}`).on('select2:select', (event) => this.onChangeFilterCs(event, index));
      // $(`#${filter.codeField}`).on('select2:clear', (event) => this.onChangeFilterCs(event, index));
      $(`#${filter.codeField}`).select2({
        tags: true,
        placeholder: filter.firstOption,
        // allowClear: true
      });
    });
    this.busyIndicator.hide();
  },

  getDataByFilter(url, fields, where = this.whereDefault, distinctValues = true) {
    const deferred = new Deferred();
    const queryTask = new QueryTask(url);
    const query = new Query();
    query.outFields = fields;
    query.where = where;

    query.returnGeometry = distinctValues ? false : true;
    query.returnDistinctValues = distinctValues;

    queryTask.execute(query)
      .then(response => {
        deferred.resolve(response);
      })
      .catch(err => {
        deferred.reject(err);
      });
    return deferred.promise;
  },

  setExtentByFilter(url, where, expand = 1.1) {
    const self = this;
    const deferred = new Deferred();
    const queryTask = new QueryTask(url);
    const query = new Query();
    query.where = where;
    query.returnGeometry = true;

    queryTask.executeForExtent(query)
      .then(response => {
        self.map.setExtent(response.extent.expand(expand), true);
        deferred.resolve(response);
      })
      .catch(err => {
        console.error('err', err);
        deferred.reject(err);
      });
    return deferred.promise;
  },

  destroyFormSearchCs() {
    this.containerBodyApCs.innerHTML = '';
  },

  destroyFormRadioCs() {
    this.radioContainerApCs.innerHTML = '';
  },

  makeOptionCs(options, selectControl, valueField, labelField, firstOption, fixOptionSelected = true) {
    let selectedValue = null;
    if (fixOptionSelected) {
      const selectedIndex = selectControl.selectedIndex;
      if (selectedIndex > 1) {
        selectedValue = selectControl.options[selectedIndex].value;
      }
    }
    selectControl.innerHTML = '';
    const phOption = document.createElement('option');
    phOption.text = firstOption;
    phOption.value = '';
    selectControl.appendChild(phOption);

    const restoreOption = document.createElement('option');
    // restoreOption.text = firstOption;
    restoreOption.text = 'Vacío';
    restoreOption.value = '0';
    restoreOption.selected = false;
    // restoreOption.disabled = true;
    selectControl.appendChild(restoreOption);

    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.attributes[valueField];
      optionElement.innerHTML = option.attributes[labelField];
      if (selectedValue && selectedValue.toString() === option.attributes[valueField].toString()) {
        optionElement.selected = true;
      }
      selectControl.appendChild(optionElement);
    });
  },

  onChangeFilterCs(evt, currentFilterIndex) {
    this.busyIndicator.show();
    let where = this.manageWhere();
    if (where === '') {
      where = this.whereDefault;
    }
    const selectedIndex = evt.target.selectedIndex;
    const selectedValue = evt.target.options[selectedIndex].value;
    const currentFilter = this.groupSelected.filters[currentFilterIndex];

    if (selectedValue === '0') {
      // si se selecionar "vacio" con un value igual a 0; el select no debe tener ningun valor seleccionado
      evt.currentTarget.value = '';
      // evt.currentTarget.options[0].selected = true;
      evt.currentTarget.dispatchEvent(new Event('change'));
    };

    const fields = [currentFilter.codeField, currentFilter.nameField];
    // const where = `${currentFilter.codeField} = '${selectedValue}'`;

    let responseFilter;

    const url = this.urlLayerSelected || currentFilter.url;
    const layersSelected = this.layersSelected;

    const webmap = this.map;

    return this.getDataByFilter(url, fields, where, false)
      .then((response) => {
        responseFilter = response;
        if (!currentFilter.isZoom && !currentFilter.anotherZoom) {
          return null;
        }
        if (currentFilter.isZoom) {
          if (responseFilter.features.length === 1 && responseFilter.features[0].geometry.type === 'point') {
            return this.map.centerAndZoom(responseFilter.features[0].geometry, 17);
          }
          if (responseFilter.features.length === 0) {
            throw new Error(`No se encontraron resultados de ${this.labelLayerSelected} en esta ubicación`);
            // console.log("No se encontraron resultados");
            // return;
          }
          return this.setExtentByFilter(url, where);
        };
        if (currentFilter.anotherZoom) {
          const whereLimit = this.manageWhereLimits();
          webmap.getLayer(currentFilter.anotherZoom.idLayer).setDefinitionExpression(whereLimit)
          // if (selectedValue === '0') {
          //   return;
          // };
          // const whereAnother = `${currentFilter.anotherZoom.field} = '${selectedValue}'`;
          return this.setExtentByFilter(currentFilter.anotherZoom.url, whereLimit, expand = 1);
        };
      })
      .then(() => {
        if (responseFilter.features.length === 0) {
          return;
        }
        const promises = this.groupSelected.filters.map((filter, index) => {
          if (selectedValue === '0') {
            const urlFilter = this.urlLayerSelected || filter.url;
            const fieldsFilter = [filter.codeField, filter.nameField];
            return this.getDataByFilter(urlFilter, fieldsFilter, where)
              .then(data => {
                if (data.features.length === 1000) {
                  // disable select
                  $(`#${filter.codeField}`).prop("disabled", true);
                } else {
                  $(`#${filter.codeField}`).prop("disabled", false);
                  this.makeOptionCs(data.features, document.getElementById(filter.codeField), filter.codeField, filter.nameField, filter.firstOption);
                }

              });
          }
          else if (evt.target.id !== filter.codeField) {
            const urlFilter = this.urlLayerSelected || filter.url;
            const fieldsFilter = [filter.codeField, filter.nameField];
            return this.getDataByFilter(urlFilter, fieldsFilter, where)
              .then(data => {
                if (data.features.length === 1000) {
                  // disable select
                  $(`#${filter.codeField}`).prop("disabled", true);
                } else {
                  $(`#${filter.codeField}`).prop("disabled", false);
                  this.makeOptionCs(data.features, document.getElementById(filter.codeField), filter.codeField, filter.nameField, filter.firstOption);
                }
              });
          }
        });
        return all(promises);
        // this.groupSelected.filters.forEach(filter => {
        // makeOption by each filter

        // });
        //   if (!currentFilter.filterAffected) {
        //     return;
        //   }
        //   currentFilter.filterAffected.forEach(affectedIndex => {
        //     const affectedFilter = this.groupSelected.filters[affectedIndex];
        //     const affectedSelect = document.getElementById(affectedFilter.codeField);
        //     const urlFilter = this.urlLayerSelected || affectedFilter.url;
        //     const fieldsFilter = [affectedFilter.codeField, affectedFilter.nameField];
        //     const whereFilter = `${currentFilter.codeField} = '${selectedValue}'`;
        //     this.getDataByFilter(urlFilter, fieldsFilter, whereFilter)
        //       .then(data => {
        //         this.makeOptionCs(data.features, affectedSelect, affectedFilter.codeField, affectedFilter.nameField, affectedFilter.firstOption);
        //       })
        //       .then(() => {
        //         let filterAffectedReset = affectedFilter.filterAffected;
        //         while (filterAffectedReset.length > 0) {
        //           filterAffectedReset = this.resetSelectIndexArray(filterAffectedReset);
        //         }
        //       })
        //       .catch(err => {
        //         console.error(`Error al actualizar el filtro ${affectedFilter.label}:`, err);
        //       });
        //   });
      })
      .then(() => {
        layersSelected.layersId.forEach(layer => {
          // console.log('layer', layer);
          // search fields in where, but not set definition expression
          const verifyFields = webmap.getLayer(layer).fields.filter(field => {
            if (where.includes(field.name)) {
              return field.name;
            };

          });

          if (verifyFields.length === 0) {
            return;
          }
          webmap.getLayer(layer).setDefinitionExpression(where);
        });
        // return all(promises);
        this.busyIndicator.hide();
      })
      .catch(err => {
        this.showMessageCs(err.message, 'error');
        // console.error('err', err);
        this.busyIndicator.hide();
      });
  },

  // resetSelectIndexArray(indexArray) {
  //   const newAffectedFilters = [];
  //   this.groupSelected.filters.forEach(filter => {
  //     indexArray.forEach(index => {
  //       if (filter.index === index) {
  //         const select = document.getElementById(filter.codeField);
  //         select.innerHTML = '';
  //         const phOption = document.createElement('option');
  //         phOption.text = filter.firstOption;
  //         phOption.value = '';
  //         select.appendChild(phOption);
  //         const restoreOption = document.createElement('option');
  //         // restoreOption.text = filter.firstOption;
  //         restoreOption.text = 'Vacío';
  //         restoreOption.value = '0';
  //         restoreOption.selected = false;
  //         // restoreOption.disabled = false;
  //         select.appendChild(restoreOption);
  //         newAffectedFilters.push(filter.filterAffected);
  //       }
  //     });
  //   });

  //   return newAffectedFilters.flat();
  // },

  getCountByWhere(ulr, where) {
    const deferred = new Deferred();
    const queryTask = new QueryTask(ulr);
    const query = new Query();
    query.where = where;
    query.returnGeometry = false;
    queryTask.executeForCount(query)
      .then(response => {
        deferred.resolve(response);
      })
      .catch(err => {
        deferred.reject(err);
      });
    return deferred.promise;
  },

  makeSelectorLayers(layers) {
    layers.sort((a, b) => a.index - b.index);
    this.formRadioContainersApCs.innerHTML = '';

    let idSelected;

    layers.forEach(layer => {

      const radioItemContainer = document.createElement('div');
      radioItemContainer.classList.add('radioItemContainerCs');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'searchType';
      input.id = layer.id;
      if (layer.selected) {
        idSelected = layer.id;
      };
      radioItemContainer.appendChild(input);
      const label = document.createElement('label');
      label.for = layer.id;
      label.innerHTML = layer.label;
      radioItemContainer.appendChild(label);
      if (!layer.visible) {
        // display none
        radioItemContainer.style.display = 'none';
      }
      this.formRadioContainersApCs.appendChild(radioItemContainer);
    });
    dojo.query('.radioItemContainerCs input').on('click', this.handleRadioButtonClick.bind(this));
    // execute event ckecked the radio button selected by id programmatically in dom
    if (idSelected) {
      document.getElementById(idSelected).checked = true;
      document.getElementById(idSelected).click();
    };
  },

  handleRadioButtonClick(event) {
    const layerSelected = this.groupSelected.layersForm.layers.find(layer => layer.id === event.target.id);
    this.layersSelected = layerSelected;
    if (layerSelected) {
      this.groupSelected.layersForm.layers.forEach(layer => {
        if (layer.id === event.target.id) {
        } else {
          layer.layersId.forEach(layerId => {
            if (this.map.getLayer(layerId).visible & layerSelected.layersId[0] != layerId) {
              this.map.getLayer(layerId).setVisibility(false)
            };
          });
        }
      });
      layerSelected.layersId.forEach(layerId => {
        if (!this.map.getLayer(layerId).visible) {
          this.map.getLayer(layerId).setVisibility(true);
        };
      });

      this.urlLayerSelected = this.map.getLayer(layerSelected.layersId[0]).url;
      this.labelLayerSelected = layerSelected.label;
    }
  },

  manageWhere() {
    let where = [];
    this.groupSelected.filters.forEach(filter => {
      const select = document.getElementById(filter.codeField);
      // get value selected
      const selectedIndex = select.selectedIndex;
      if (selectedIndex > 1) {
        // create where
        const selectedValue = select.options[selectedIndex].value;
        where.push(`(${filter.codeField} = '${selectedValue}')`);
      };
    });
    // console.log('where', where.join(' AND '));
    return where.join(' AND ');
  },

  manageWhereLimits() {
    let where = [];
    this.groupSelected.filters.forEach(filter => {
      if (filter.anotherZoom) {
        const select = document.getElementById(filter.codeField);
        // get value selected
        const selectedIndex = select.selectedIndex;
        if (selectedIndex > 1) {
          // create where
          const selectedValue = select.options[selectedIndex].value;
          where.push(`(${filter.anotherZoom.field} = '${selectedValue}')`);
        };
      }
    });

    if (where.length === 0) {
      return this.whereDefault;
    };
    // console.log('where', where.join(' AND '));
    return where.join(' AND ');
  },

  resetAllOpionSelected(evt) {
    // execute buildFormSearchCs
    // this.busyIndicator.show();

    this.buildFormSearchCs();
    this.layersSelected.layersId.forEach(layerId => {
      this.map.getLayer(layerId).setDefinitionExpression(this.whereDefault);
    });
    this.executeHomeExtent();
  },

  // onClose(){
  //   console.log('DynamicSearchWidgetCunaMas::onClose');
  // },
  // onMinimize(){
  //   console.log('DynamicSearchWidgetCunaMas::onMinimize');
  // },
  // onMaximize(){
  //   console.log('DynamicSearchWidgetCunaMas::onMaximize');
  // },
  // onSignIn(credential){
  //   console.log('DynamicSearchWidgetCunaMas::onSignIn', credential);
  // },
  // onSignOut(){
  //   console.log('DynamicSearchWidgetCunaMas::onSignOut');
  // }
  // onPositionChange(){
  //   console.log('DynamicSearchWidgetCunaMas::onPositionChange');
  // },
  // resize(){
  //   console.log('DynamicSearchWidgetCunaMas::resize');
  // }
});
