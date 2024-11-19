import declare from 'dojo/_base/declare';
import BaseWidget from 'jimu/BaseWidget';
import _WidgetsInTemplateMixin from 'dijit/_WidgetsInTemplateMixin';
import WidgetManager from "jimu/WidgetManager"
import QueryTask from "esri/tasks/QueryTask";
import Query from "esri/tasks/query";
import Deferred from "dojo/Deferred";
import all from "dojo/promise/all";
import BusyIndicator from 'esri/dijit/util/busyIndicator';
// import StatisticDefinition from "esri/tasks/StatisticDefinition"

const fontAwesome = document.createElement('script');
fontAwesome.src = 'https://use.fontawesome.com/releases/v5.3.1/js/all.js';
document.head.appendChild(fontAwesome);

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
    const homeWidget = WidgetManager.getInstance().getWidgetsByName("HomeButton");
    this.map.setExtent(homeWidget[0].homeDijit.extent);
    isFirstLoad = true;
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
    const filters = this.groupSelected.filters;
    filters.sort((a, b) => a.index - b.index);
    this.containerBodyApCs.innerHTML = '';
    filters.forEach((filter, index) => {
      const label = document.createElement('p');
      label.classList.add('labelComboBoxClsCs');
      label.innerHTML = filter.label;
      this.containerBodyApCs.appendChild(label);

      const select = document.createElement('select');
      select.classList.add('comboBoxClsCs');
      select.id = filter.codeField;
      if (filter.startupData) {
        const urlFilter = this.urlLayerSelected || filter.url;
        const fieldsFilter = [filter.codeField, filter.nameField];
        this.getDataByFilter(urlFilter, fieldsFilter)
          .then(response => {
            this.makeOptionCs(response.features, select, filter.codeField, filter.nameField, filter.firstOption);
          })
          .catch(err => {
            console.error('err', err);
          });

      };
      select.addEventListener('change', (event) => this.onChangeFilterCs(event, index));
      this.containerBodyApCs.appendChild(select);
    });
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

  setExtentByFilter(url, where) {
    const self = this;
    const deferred = new Deferred();
    const queryTask = new QueryTask(url);
    const query = new Query();
    query.where = where;
    query.returnGeometry = true;

    queryTask.executeForExtent(query)
      .then(response => {
        self.map.setExtent(response.extent.expand(1.1), true);
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
      if (selectedIndex > 0) {
        selectedValue = selectControl.options[selectedIndex].value;
      }
    }
    selectControl.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.text = firstOption;
    defaultOption.value = '';
    defaultOption.selected = true;
    // defaultOption.disabled = true;
    selectControl.appendChild(defaultOption);
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.attributes[valueField];
      optionElement.innerHTML = option.attributes[labelField];
      if (selectedValue && selectedValue === option.attributes[valueField]) {
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

    const fields = [currentFilter.codeField, currentFilter.nameField];
    // const where = `${currentFilter.codeField} = '${selectedValue}'`;

    let responseFilter;

    const url = this.urlLayerSelected || currentFilter.url;
    return this.getDataByFilter(url, fields, where, false)
      .then((response) => {
        responseFilter = response;
        if (!currentFilter.isZoom) {
          return null;
        }
        if (responseFilter.features.length === 1 && responseFilter.features[0].geometry.type === 'point') {
          return this.map.centerAndZoom(responseFilter.features[0].geometry, 17);
        }
        return this.setExtentByFilter(url, where);
      })
      .then(() => {
        const promises = this.groupSelected.filters.map((filter, index) => {
          const urlFilter = this.urlLayerSelected || filter.url;
          const fieldsFilter = [filter.codeField, filter.nameField];
          return this.getDataByFilter(urlFilter, fieldsFilter, where)
            .then(data => {
              this.makeOptionCs(data.features, document.getElementById(filter.codeField), filter.codeField, filter.nameField, filter.firstOption);
            });
          // }
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
        this.busyIndicator.hide();
      })
      .catch(err => {
        console.error('err', err);
        this.busyIndicator.hide();
      });
  },

  resetSelectIndexArray(indexArray) {
    const newAffectedFilters = [];
    this.groupSelected.filters.forEach(filter => {
      indexArray.forEach(index => {
        if (filter.index === index) {
          const select = document.getElementById(filter.codeField);
          select.innerHTML = '';
          const defaultOption = document.createElement('option');
          defaultOption.text = filter.firstOption;
          defaultOption.value = '';
          defaultOption.selected = true;
          // defaultOption.disabled = false;
          select.appendChild(defaultOption);
          newAffectedFilters.push(filter.filterAffected);
        }
      });
    });

    return newAffectedFilters.flat();
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
    }
  },

  manageWhere() {
    let where = [];
    this.groupSelected.filters.forEach(filter => {
      const select = document.getElementById(filter.codeField);
      // get value selected
      const selectedIndex = select.selectedIndex;
      if (selectedIndex > 0) {
        // create where
        const selectedValue = select.options[selectedIndex].value;
        where.push(`(${filter.codeField} = '${selectedValue}')`);
      };
    });
    return where.join(' AND ');
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
