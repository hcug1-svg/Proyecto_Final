/**
 * Contratos estructurales (interfaces) consumidos por los servicios.
 * JavaScript no exige herencia: cualquier implementación que respete
 * el contrato es sustituible (por ejemplo, MySQL o repositorio en memoria).
 *
 * Interface Segregation: un servicio de movimientos necesita StockPort y
 * MovementWriterPort; no necesita funciones para eliminar categorías.
 *
 * @typedef {{ list(filters:object):Promise<object[]>, find(id:number):Promise<object|null>,
 *   create(data:object,tx:object):Promise<number>, update(id:number,data:object):Promise<boolean>,
 *   archive(id:number):Promise<boolean> }} ProductCatalogPort
 *
 * @typedef {{ findActiveForUpdate(id:number,tx:object):Promise<object|null>,
 *   setStock(id:number,stock:number,tx:object):Promise<void> }} StockPort
 *
 * @typedef {{ exists(id:number,tx?:object):Promise<boolean> }} CategoryLookupPort
 *
 * @typedef {{ list():Promise<object[]>, create(data:object):Promise<number>,
 *   update(id:number,data:object):Promise<boolean>, countReferences(id:number):Promise<number>,
 *   delete(id:number):Promise<boolean> }} CategoryCatalogPort
 *
 * @typedef {{ list(filters:object):Promise<object[]>, recent(limit:number):Promise<object[]> }} MovementReaderPort
 * @typedef {{ create(data:object,tx:object):Promise<number> }} MovementWriterPort
 * @typedef {{ summary():Promise<object> }} MetricsPort
 * @typedef {{ execute(operation: (tx:object)=>Promise<any>):Promise<any> }} UnitOfWorkPort
 *
 * La composición central elige los repositorios concretos. Los servicios
 * sólo consumen métodos de estos contratos y no importan controladores SQL.
 */
module.exports = {};
