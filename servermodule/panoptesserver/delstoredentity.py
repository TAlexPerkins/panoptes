# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import uuid
import os
import config


def response(returndata):

    #!!! todo: check that the table is a valid storage repo

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tablename = DQXDbTools.ToSafeIdentifier(returndata['tablename'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])


    db = DQXDbTools.OpenDatabase(DQXDbTools.ParseCredentialInfo(returndata), databaseName)
    cur = db.cursor()


    sql = "DELETE FROM {0} WHERE id='{1}'".format(tablename, id)
    cur.execute(sql)

    db.commit()
    db.close()

    return returndata